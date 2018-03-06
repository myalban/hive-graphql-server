import { withFilter } from 'graphql-subscriptions';
import pubsub from '../../pubsub';
import { callMethodAtEndpoint } from '../../meteor-helpers/method-endpoint';
import { getDisplayNamesForUsers } from '../../utils/users';
import { limitQuery, applyPagination } from '../../utils/pagination-helpers';

exports.Query = {
  group: async (root, { _id }, { mongo: { Groups } }) => await Groups.findOne({ _id }),
};

exports.Subscription = {
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

  groupChanged: {
    // asyncIterator w/ workspace points to redis channel topic
    subscribe: withFilter(
      (root, args) => pubsub.asyncIterator(`groupChanged.${args.workspace}`),
      (payload, { groupIds = [] }, { user }) => {
        // Only return groups where user is member and cares about group (groupIds array).
        const group = payload.groupChanged;
        const userInGroup = group.members.includes(user._id);
        // Empty array means listen to all groups.
        const caresAboutGroup = groupIds.length ? groupIds.includes(group._id) : true;
        return userInGroup && caresAboutGroup;
      }),
  },
};

exports.Mutation = {
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

  newReadBy: async (root, { _id }, { user }) => {
    return await callMethodAtEndpoint('groups.newReadBy', { 'x-userid': user._id }, [{ groupId: _id }]);
  },
};

exports.Group = {
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
  users: async ({ members }, data, { mongo: { Users } }) => {
    return await Users.find({ _id: { $in: members } }).toArray();
  },
  readBy: async ({ readBy }, data, { mongo: { Users } }) => {
    const userIds = readBy.map(item => item.userId);
    const users = await Users.find({ _id: { $in: userIds } }).toArray();
    // map readBy userIds to user objects
    const result = readBy.map(r => ({
      date: r.date,
      user: users.find(u => u._id === r.userId),
    })).filter(readByObject => !!readByObject.user); // Filter out not found users.
    return result;
  },
  isTyping: async ({ isTyping }, data, { mongo: { Users } }) => {
    const users = await Users.find({ _id: { $in: isTyping } }).toArray();
    return users;
  },
};
