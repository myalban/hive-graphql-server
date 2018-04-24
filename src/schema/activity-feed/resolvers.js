import { callMethodAtEndpoint } from '../../meteor-helpers/method-endpoint';
import { limitQuery, applyPagination } from '../../utils/pagination-helpers';

exports.Query = {
  activityFeeds: async (root, { isRead, first, last, before, after, sortField = 'createdAt', sortOrder = 1 }, { mongo: { ActivityFeeds, Workspaces }, user }) => {
    const workspaces = await Workspaces.find({ members: { $in: [user._id] } }).toArray();

    const workspaceIds = workspaces.map(wk => wk._id);

    const q = {
      assignedTo: user._id,
      historyItem: false,
      deleted: false,
      workspace: { $in: workspaceIds },
    };

    // optional argument, if it isn't passed we return all feeds (read and unread)
    if (isRead !== undefined) {
      q.isRead = isRead;
    }

    const cursor = await limitQuery(ActivityFeeds, { sortField, sortOrder, before, after, q });
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
};

exports.Mutation = {
  updateFeedAllRead: async (root, data, { user }) => {
    callMethodAtEndpoint('updateFeedAllRead', { 'x-userid': user._id });
  },
  updateFeedRead: async (root, { attachedItemId, isRead }, { user }) => {
    callMethodAtEndpoint('updateFeedRead', { 'x-userid': user._id }, [attachedItemId, isRead]);
  },
  updateMessagesFeedRead: async (root, { groupId }, { user }) => {
    callMethodAtEndpoint('updateMessagesFeedRead', { 'x-userid': user._id }, [groupId]);
  },
};

exports.ActivityFeed = {
  actorId: async ({ actorId }, data, { mongo: { Users } }) => {
    return Users.findOne({ _id: actorId });
  },
};
