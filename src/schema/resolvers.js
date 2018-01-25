import _ from 'lodash';
import { withFilter } from 'graphql-subscriptions';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import SHA256 from '../meteor-helpers/sha256';
import pubsub from '../pubsub';
import { JWT_SECRET } from '../config';
import { limitQuery, applyPagination } from '../utils/pagination-helpers';
import { assertUserPermission } from '../utils/validation';
import { callMethodAtEndpoint } from '../meteor-helpers/method-endpoint';
import { globalRank, transformStringAttrsToDates, getPrivacyClause, createNewNotification, updateParentSubactionCount } from '../utils/helpers';
import ancestorAttributes from '../utils/ancestor-attributes';
import { getDisplayNamesForUsers } from '../utils/users';

module.exports = {
  Query: {
    actionList: async (root, { name, viewId, workspace, limit = null, skip = 0, filters = {} },
      { mongo: { Actions, Workspaces }, user }) => {
      await assertUserPermission(workspace, user._id, Workspaces);

      const isCompleted = filters.actionType === 'completed';
      console.log(name);
      console.log(workspace);
      console.log(limit);
      console.log(skip);
      console.log(filters);

      const query = {
        workspace,
        assignees: user._id,
        deleted: false,
        archived: false,
        isRecurringVisible: { $ne: false },
        checked: false,
      };

      const options = { sort: { rank: 1 } };
      if (filters.sortType === 'deadline') {
        options.sort = { deadline: -1, rank: 1 };
      }

      if (isCompleted) {
        query.checked = true;
        query.checkedDate = { $ne: null };
        options.sort = { checkedDate: -1, rank: 1 };
      }

      if (limit) {
        options.limit = limit;
        options.skip = skip;
      }

      const cursor = Actions.find(query, options);
      return {
        actions: cursor.toArray(),
        count: isCompleted ? cursor.count() : null,
      };
    },
    user: async (root, { _id, email }, { mongo: { Users } }) => {
      let query;
      if (_id) query = { _id };
      else if (email) query = { 'emails.address': email };
      return await Users.findOne(query);
    },
    group: async (root, { _id }, { mongo: { Groups } }) => await Groups.findOne({ _id }),
  },
  Subscription: {
    groupAdded: {
      // asyncIterator w/ workspace points to redis channel topic
      subscribe: withFilter(
        (root, args) => pubsub.asyncIterator(`groupAdded.${args.workspace}`),
        (payload, args, { user }) => {
          // Only return groups where user is member and not creator.
          const group = payload.groupAdded;
          return group.members.includes(user._id) && user._id !== group.createdBy;
        }),
    },
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
  },
  Mutation: {
    login: async (root, { email, password }, { mongo: { Users } }) => {
      // Find user by email
      // TODO: Handle already logged in?
      const sentEmailRegex = new RegExp(email, 'i');
      const user = await Users.findOne({ 'emails.0.address': sentEmailRegex });
      if (user) {
        // Validate password
        let valid;
        try {
          const passwordString = SHA256(password);
          valid = await bcrypt.compare(passwordString, user.services.password.bcrypt);
        } catch (invalidPasswordErr) {
          throw new Error('Invalid email and password combination');
        }
        if (valid) {
          const token = jwt.sign({
            _id: user._id,
            email: user.emails[0].address,
          }, JWT_SECRET);
          user.jwt = token;
          return user;
        }
        throw new Error('Invalid email and password combination');
      }
      throw new Error('Email not found');
    },
    insertMessage: async (root, { workspace, groupId, body }, { user }) => {
      const methodArgs = {
        workspace,
        containerType: 'group',
        containerId: groupId,
        body,
        mentions: [],
        attachments: [],
        automated: false,
        senderPicture: null,
        senderFirstName: null,
      };
      const message = await callMethodAtEndpoint('messages.insert', { 'x-userid': user._id }, [methodArgs]);
      return message;
    },
    insertGroup: async (root, { workspace, members, name, oneToOne, projectId },
      { mongo: { Groups }, user }) => {
      if (oneToOne) {
        const dmQuery = {
          workspace,
          members: { $all: members, $size: members.length },
          oneToOne: true,
        };
        const group = await Groups.findOne(dmQuery);

        if (group) {
          if (group.deleted) {
            group.deleted = false;
            Groups.update(dmQuery, { $set: { deleted: false } });
          }

          return group;
        }
      }

      const methodArgs = {
        workspace,
        members,
        oneToOne,
      };
      if (name && !oneToOne) methodArgs.name = name;
      if (projectId) methodArgs.projectId = projectId;

      return await callMethodAtEndpoint('groups.insert', { 'x-userid': user._id }, [methodArgs]);
    },
    leaveGroup: async (root, { _id }, { user }) => {
      const methodArgs = {
        groupId: _id,
      };
      const group = await callMethodAtEndpoint('groups.leaveGroup', { 'x-userid': user._id }, [methodArgs]);
      return group;
    },
    deleteGroup: async (root, { _id }, { user }) => {
      const methodArgs = {
        groupId: _id,
      };
      const group = await callMethodAtEndpoint('groups.delete', { 'x-userid': user._id }, [methodArgs]);
      return group;
    },
    updateUserTimezone: async (root, { timezone }, { mongo: { Users }, user }) => {
      const methodArgs = {
        timezone,
      };
      await callMethodAtEndpoint('users.updateTimezone', { 'x-userid': user._id }, [methodArgs]);
      return await Users.findOne({ _id: user._id });
    },
    updateUserLastWorkspace: async (root, { workspace }, { mongo: { Users },
      user }) => {
      await callMethodAtEndpoint('updateUserLastWorkspace', { 'x-userid': user._id }, [workspace]);
      await callMethodAtEndpoint('users.updateWorkspaceTime', { 'x-userid': user._id }, [{ workspaceId: workspace }]);
      return await Users.findOne({ _id: user._id });
    },
    insertAction: async (root, data, { mongo: { Actions, Workspaces }, user }) => {
      await assertUserPermission(data.action.workspace, user._id, Workspaces);
      const { _id } = data.action;
      const { aboveActionId, belowActionId } = data;
      const action = transformStringAttrsToDates(data.action);

      action.modifiedAt = new Date();
      action.modifiedBy = user._id;
      action.createdAt = new Date();
      action.createdBy = user._id;

      action.rank = await globalRank(Actions, action.workspace, aboveActionId, belowActionId);
      await Actions.insert(action);
      createNewNotification(user._id, action, action._id, true);
      return await Actions.findOne({ _id });
    },
    updateAction: async (root, data, { mongo: { Actions, Workspaces }, user }) => {
      await assertUserPermission(data.action.workspace, user._id, Workspaces);

      const { _id } = data.action;
      const action = transformStringAttrsToDates(data.action);

      action.modifiedAt = new Date();
      action.modifiedBy = user._id;
      const $set = action;

      await Actions.update({ _id }, { $set });
      return await Actions.findOne({ _id });
    },
    updateActionChildren: async (root, data, { mongo: { Actions, Workspaces }, user }) => {
      const _id = data.actionId;
      const action = await Actions.findOne({ _id });
      if (!action) return;

      await assertUserPermission(action.workspace, user._id, Workspaces);

      const attrs = transformStringAttrsToDates(data.attrs);
      attrs.modifiedAt = new Date();
      attrs.modifiedBy = user._id;
      const $set = attrs;

      await Actions.update({ _id }, { $set }, { multi: true });
      return await Actions.findOne({ _id });
    },
    updateActionChecked: async (root, data, { mongo: { Actions, Workspaces }, user }) => {
      const _id = data.actionId;
      const oldAction = await Actions.findOne({ _id });
      if (!oldAction) return;
      const workspace = oldAction.workspace;
      await assertUserPermission(workspace, user._id, Workspaces);

      const $set = {};
      if (data.checked) {
        $set.status = 'Completed';
        $set.checkedDate = new Date();
      } else {
        $set.status = 'Unstarted';
        $set.checkedDate = null;
      }

      $set.checked = data.checked;
      $set.modifiedAt = new Date();
      $set.modifiedBy = user._id;

      await Actions.update({ _id }, { $set });
      // it is subaction, update parent count
      if (oldAction.parent) {
        updateParentSubactionCount(Actions, { parent: oldAction.parent });
      }
      createNewNotification(user._id, oldAction, oldAction._id, false);
      return await Actions.findOne({ _id });
    },
    updateActionTitle: async (root, data, { mongo: { Actions, Workspaces }, user }) => {
      const _id = data.actionId;
      const action = await Actions.findOne({ _id });
      if (!action) return;
      const workspace = action.workspace;
      await assertUserPermission(workspace, user._id, Workspaces);

      const $set = {};

      $set.title = data.title;
      $set.modifiedAt = new Date();
      $set.modifiedBy = user._id;

      await Actions.update({ _id }, { $set });

      ancestorAttributes.updateTitleById(action, data.title);
      return await Actions.findOne({ _id });
    },
    updateActionChildrenChecked: async (root, data, { mongo: { Actions, Workspaces }, user }) => {
      const actionId = data.actionId;
      const action = await Actions.findOne({ _id: actionId });
      if (!action) return;
      const workspace = action.workspace;
      await assertUserPermission(action.workspace, user._id, Workspaces);

      const $set = {};
      if (data.checked) {
        $set.status = 'Completed';
        $set.checkedDate = new Date();
      } else {
        $set.status = 'Unstarted';
        $set.checkedDate = null;
      }

      $set.checked = data.checked;
      $set.modifiedAt = new Date();
      $set.modifiedBy = user._id;
      const query = {
        deleted: false,
        workspace,
        $or: getPrivacyClause(user._id),
      };

      if (!action.root) {
        query.root = actionId;
      } else {
        let subactionIds = await Actions.find(
          { root: action.root, ancestorAttributes: { $elemMatch: { id: actionId } } },
          { fields: { _id: 1 } }).toArray();

        if (!subactionIds.length) return false;

        subactionIds = subactionIds.map(a => a._id);
        query._id = { $in: subactionIds };
      }

      await Actions.updateMany(query, { $set });

      ancestorAttributes.updateStatusByQuery(query, $set.status);

      updateParentSubactionCount(Actions, query);

      return true;
    },
    updateUserOnlineStatus: async (root, { status }, { mongo: { Users }, user }) => {
      await Users.update({ _id: user._id }, { $set: { status } });
      return await Users.findOne({ _id: user._id });
    },
  },
  Action: {
    description: ({ description }) => description || '',
  },
  Group: {
    name: async ({ name, oneToOne, workspace, members }, data,
      { mongo: { Workspaces, Users }, user }) => {
      if (oneToOne) {
        const membersWithoutMyself = members.filter(m => m !== user._id);
        const wk = await Workspaces.findOne({ _id: workspace });
        const allWorkspaceMembers = await Users.find({ _id: { $in: wk.members } }).toArray();
        // Temporary until we cache display name on the user object (data loaders)
        const dislplayNames = getDisplayNamesForUsers(membersWithoutMyself, allWorkspaceMembers);

        return dislplayNames.join(', ');
      }

      return name || 'Unnamed group';
    },
    messages: async ({ _id, workspace }, { first, last, before, after, sortField = 'createdAt', sortOrder = -1 }, { mongo: { Messages } }) => {
      // TODO: Only show messages user can access
      // TODO: Validate input arguments
      // TODO: Data loaders
      const q = {
        workspace,
        containerId: _id,
      };
      const cursor = await limitQuery(Messages, { sortField, sortOrder, before, after, q });
      const pageInfo = await applyPagination(cursor, first, last);
      const messages = await cursor.toArray();
      return {
        edges: messages.map(m => ({
          node: m,
          cursor: m._id,
        })),
        pageInfo,
      };
    },
    users: async ({ workspace, members }, data, { mongo: { Users, Groups } }) => {
      return await Users.find({ _id: { $in: members } }).toArray();
      // return [];
    },
  },
  Message: {
    senderPicture: ({ senderPicture }) => senderPicture || '',
    deleted: ({ deleted }) => deleted || false,
    edited: ({ edited }) => edited || false,
    automated: ({ automated }) => automated || false,
    from: async ({ sender, senderFirstName }, data, { mongo: { Users } }) => {
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
  },
  User: {
    email: ({ emails }) => {
      return emails[0].address;
    },
    firstName: ({ profile }) => {
      return profile.firstName || '';
    },
    lastName: ({ profile }) => {
      return profile.lastName || '';
    },
    username: ({ profile, emails }) => {
      const { firstName, lastName } = profile;
      const email = emails[0].address;
      return firstName && lastName ? `${firstName} ${lastName}` : email;
    },
    groups: async ({ _id }, { workspace }, { mongo: { Groups } }) => {
      const query = {
        members: _id,
        deleted: { $ne: true },
      };
      if (workspace) {
        query.workspace = workspace;
      }
      const groups = await Groups.find(query).toArray();
      return groups;
    },
    coworkers: async ({ _id }, { workspace }, { mongo: { Workspaces, Users } }) => {
      const query = { members: _id };
      if (workspace) {
        query._id = workspace;
      }
      const workspaces = await Workspaces.find(query).toArray();
      const members = workspaces.reduce((acc, curr) => _.uniq(acc.concat(curr.members)), []);
      return await Users.find({ _id: { $in: members } }).toArray();
    },
    lastWorkspace: ({ profile: { lastWorkspace } }) => lastWorkspace || '',
    settings: async (root, { workspace }, { mongo: { UserSettings } }) => {
      const userId = root._id;
      return await UserSettings.findOne({ userId, workspace });
    },
  },
  UserSettings: {
    hiddenGroups: async ({ hiddenGroups }, data, { mongo: { Groups } }) => {
      const groups = await Groups.find({ _id: { $in: hiddenGroups } }).toArray();
      return groups;
    },
  },
};
