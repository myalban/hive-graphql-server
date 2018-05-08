import { callMethodAtEndpoint } from '../../meteor-helpers/method-endpoint';
import { limitQuery, applyPagination } from '../../utils/pagination-helpers';
import pubsub from '../../pubsub';

exports.Subscription = {
  activityFeedAdded: {
    // asyncIterator w/ userId points to redis channel topic
    subscribe: (root, args, { user }) => pubsub.asyncIterator(`activityFeedAdded.${user._id}`),
  },
  activityFeedChanged: {
    // asyncIterator w/ userId points to redis channel topic
    subscribe: (root, args, { user }) => pubsub.asyncIterator(`activityFeedChanged.${user._id}`),
  },
};

exports.Query = {
  activityFeeds: async (root, { isRead, first, last, before, after, sortField = 'createdAt', sortOrder = 1 }, { mongo: { ActivityFeeds, Workspaces }, user }) => {
    const workspaces = await Workspaces.find({ $or: [{ members: user._id }, { 'externalMembers.userId': user._id }] }).toArray();

    const workspaceIds = workspaces.map(wk => wk._id);

    const q = {
      assignedTo: user._id,
      historyItem: { $ne: true },
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
    await callMethodAtEndpoint('updateFeedAllRead', { 'x-userid': user._id });
    return true;
  },
  updateFeedRead: async (root, { attachedItemId, isRead }, { user }) => {
    await callMethodAtEndpoint('updateFeedRead', { 'x-userid': user._id }, [attachedItemId, isRead]);
    return true;
  },
  updateMessagesFeedRead: async (root, { groupId }, { user }) => {
    await callMethodAtEndpoint('updateMessagesFeedRead', { 'x-userid': user._id }, [groupId]);
    return true;
  },
};

exports.ActivityFeed = {
  actor: async ({ actorId }, data, { mongo: { Users } }) => {
    return Users.findOne({ _id: actorId });
  },
};
