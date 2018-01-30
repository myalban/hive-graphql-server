import { withFilter } from 'graphql-subscriptions';
import pubsub from '../../pubsub';
import { callMethodAtEndpoint } from '../../meteor-helpers/method-endpoint';

exports.Query = {};

exports.Subscription = {
  messageAdded: {
    // asyncIterator w/ workspace points to redis channel topic
    subscribe: withFilter(
      (root, args) => pubsub.asyncIterator(`messageAdded.${args.workspace}`),
      (payload, { groupIds = [] }, { user }) => {
        // Only return messages in arguments groupIds array + messages not from current user.
        const message = payload.messageAdded;
        return groupIds.includes(message.containerId) && user._id !== message.createdBy;
      }),
  },
  messageChanged: {
    // asyncIterator w/ workspace points to redis channel topic
    subscribe: (root, args) => pubsub.asyncIterator(`messageChanged.${args.workspace}`),
  },
};

exports.Mutation = {
  insertMessage: async (root, { workspace, groupId, body, mentions = [] }, { user }) => {
    const methodArgs = {
      workspace,
      containerType: 'group',
      containerId: groupId,
      body,
      mentions,
      attachments: [],
      automated: false,
      senderPicture: null,
      senderFirstName: null,
    };

    return callMethodAtEndpoint('messages.insert', { 'x-userid': user._id }, [methodArgs]);
  },

  deleteMessage: async (root, { messageId }, { user }) => callMethodAtEndpoint(
    'messages.delete',
    { 'x-userid': user._id },
    [{ _id: messageId }],
  ),
  addReaction: async (root, { messageId, emoji }, { user }) => {
    const methodArgs = { messageId, emoji };

    return callMethodAtEndpoint('messages.addReaction', { 'x-userid': user._id }, [methodArgs]);
  },

  removeReaction: async (root, { messageId, emoji }, { user }) => {
    const methodArgs = { messageId, emoji };

    return callMethodAtEndpoint('messages.removeReaction', { 'x-userid': user._id }, [methodArgs]);
  },
};

exports.Message = {
  senderPicture: ({ senderPicture }) => senderPicture || '',
  deleted: ({ deleted }) => deleted || false,
  edited: ({ edited }) => edited || false,
  automated: ({ automated }) => automated || false,
  from: async ({ sender }, data, { mongo: { Users } }) => {
    return await Users.findOne({ _id: sender });
  },
  to: async ({ containerId }, data, { mongo: { Groups } }) => {
    return await Groups.findOne({ _id: containerId });
  },
  // TODO add support to BOX files. Currenty we don't store
  // them in the DB and subscribe to them on the fly
  files: async ({ attachments = [] }, data, { mongo: { Files } }) => {
    let files = [];
    const fileIds = attachments.filter(a => a.attachedItemType !== 'action').map(a => a.attachedItemId);
    if (fileIds.length) {
      files = await Files.find({ $or: [{ _id: { $in: fileIds } },
        { id: { $in: fileIds } }],
      deleted: false }).toArray();

      files = files.map((f) => {
        const obj = {
          _id: f.fileStore === 'dropbox' ? f.id : f._id,
          name: f.name,
          fileStore: f.fileStore,
          type: f.type,
        };

        if (f.fileStore === 'dropbox') {
          const pathArr = f.path_lower.split('/');
          pathArr.splice(pathArr.length - 1, 1);
          obj.url = `https://dropbox.com/home${pathArr.join('/')}?preview=${f.name}`;
          obj.fileStore = 'DROPBOX';
        } else if (f.fileStore === 'google') {
          obj.url = f.webViewLink;
          obj.fileStore = 'GOOGLE';
          // TODO make sure valid thumbnail exists currently we handle this on the client
          // and if the thumbnail is expired we regenerate it
          obj.thumbnail = f.thumbnailLink;
        } else {
          obj.url = f.url;
          obj.fileStore = 'HIVE';
        }

        return obj;
      });
    }
    return files;
  },
  actions: async ({ attachments = [] }, data, { mongo: { Actions } }) => {
    let actions = [];
    const actionIds = attachments.filter(a => a.attachedItemType === 'action').map(a => a.attachedItemId);
    if (actionIds.length) {
      actions = await Actions.find({ _id: { $in: actionIds }, deleted: false }).toArray();
    }
    return actions;
  },
  mentions: async ({ mentions = [] }, data, { mongo: { Users } }) => {
    if (mentions.length) {
      const users = await Users.find({ _id: { $in: mentions } }).toArray();
      return users;
    }
    return [];
  },
  reactions: async ({ reactions = [] }, data, { mongo: { Users } }) => {
    const userIds = reactions.map(r => r.userId);
    if (userIds.length) {
      const users = await Users.find({ _id: { $in: userIds } }).toArray();
      const result = reactions.map(r => ({
        emoji: r.emoji,
        userId: r.userId,
        user: users.find(u => u._id === r.userId),
      }));
      return result;
    }
    return [];
  },
};
