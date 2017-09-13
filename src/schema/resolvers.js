import pubsub from '../pubsub';
import { assertUserPermission } from '../utils/validation';
import { globalRank, transformStringAttrsToDates } from '../utils/helpers';

module.exports = {
  Query: {
    actionList: async (root, { name, viewId, workspace, limit = null, skip = 0, filters = {} },
      { mongo: { Actions, Workspaces }, user }) => {
      await assertUserPermission(workspace, user._id, Workspaces);

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

      if (viewId === 'list') {
        if (name !== 'Completed') {
          query.bucket = name;
        }
      }

      if (filters.actionType === 'completed') {
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
        count: cursor.count(),
      };
    },
  },
  Mutation: {
    insertAction: async (root, data, { mongo: { Actions, Workspaces }, user }) => {
      await assertUserPermission(data.action.workspace, user._id, Workspaces);
      const { _id } = data.action;
      const action = transformStringAttrsToDates(data.action);

      action.modifiedAt = new Date();
      action.modifiedBy = user._id;
      action.createdAt = new Date();
      action.createdBy = user._id;

      action.rank = await globalRank(Actions, action.workspace);

      await Actions.insert(action);
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
  },
  Action: {
    description: ({ description }) => description || '',
  },
};
