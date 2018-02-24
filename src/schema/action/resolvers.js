import { assertUserPermission } from '../../utils/validation';
import {
  globalRank,
  transformStringAttrsToDates,
  getPrivacyClause,
  createNewNotification,
  updateParentSubactionCount,
  getAbsoluteUrl,
} from '../../utils/helpers';
import ancestorAttributes from '../../utils/ancestor-attributes';

exports.Query = {
  actionList: async (root,
    { workspace, limit = null, skip = 0, filters = {} },
    { mongo: { Actions, Workspaces }, user }) => {
    await assertUserPermission(workspace, user._id, Workspaces);

    const isCompleted = filters.actionType === 'completed';

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
};

exports.Mutation = {
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
};

exports.Action = {
  description: ({ description }) => description || '',

  /**
   * Returns an absolute url based on current environment
   *
   * @param {object} action
   * @return {string}
   */
  url: ({ _id, workspace }) => {
    const absoluteUrl = getAbsoluteUrl();

    return `${absoluteUrl}workspace/${workspace}?actionId=${_id}`;
  },
};
