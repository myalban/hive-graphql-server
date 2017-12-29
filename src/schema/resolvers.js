import _ from 'lodash';
import { withFilter } from 'graphql-subscriptions';
import pubsub from '../pubsub';
import { limitQuery, applyPagination } from '../utils/pagination-helpers';
import { assertUserPermission } from '../utils/validation';
import { callMethodAtEndpoint } from '../meteor-helpers/method-endpoint';
import { globalRank, transformStringAttrsToDates, getPrivacyClause, createNewNotification, updateParentSubactionCount } from '../utils/helpers';
import ancestorAttributes from '../utils/ancestor-attributes';

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
    insertMessage: async (root, { workspace, groupId, body }, { req }) => {
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
      const message = await callMethodAtEndpoint('messages.insert', { authorization: req.headers.authorization }, [methodArgs]);
      return message;
    },
    insertGroup: async (root, { workspace, members, name, oneToOne, projectId }, { req }) => {
      const methodArgs = {
        workspace,
        members,
        oneToOne,
      };
      if (name && !oneToOne) methodArgs.name = name;
      if (projectId) methodArgs.projectId = projectId;
      const group = await callMethodAtEndpoint('groups.insert', { authorization: req.headers.authorization }, [methodArgs]);
      return group;
    },
    leaveGroup: async (root, { _id }, { req }) => {
      const methodArgs = {
        groupId: _id,
      };
      const group = await callMethodAtEndpoint('groups.leaveGroup', { authorization: req.headers.authorization }, [methodArgs]);
      return group;
    },
    deleteGroup: async (root, { _id }, { req }) => {
      const methodArgs = {
        groupId: _id,
      };
      const group = await callMethodAtEndpoint('groups.delete', { authorization: req.headers.authorization }, [methodArgs]);
      return group;
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
  },
  Action: {
    description: ({ description }) => description || '',
  },
  Group: {
    name: async ({ name, oneToOne, members }, data, { mongo: { Groups } }) => {
      // TODO: Figure out group name resolver
      return oneToOne ? 'DM' : name || 'Unnamed group';
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
    from: async ({ sender, senderFirstName }, data, { mongo: { Users } }) => {
      return await Users.findOne({ _id: sender });
    },
  },
  User: {
    email: ({ emails }) => {
      return emails[0].address;
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
  },
};
