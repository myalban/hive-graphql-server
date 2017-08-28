import { ObjectID } from 'mongodb';
import pubsub from '../pubsub';
import { assertValidLink } from '../utils/validation';


function buildFilters ({ OR = [], description_contains, url_contains }) {
  const filter = (description_contains || url_contains) ? {} : null;
  if (description_contains) {
    filter.description = { $regex: `.*${description_contains}.*` };
  }
  if (url_contains) {
    filter.url = { $regex: `.*${url_contains}.*` };
  }

  let filters = filter ? [filter] : [];
  for (let i = 0; i < OR.length; i++) {
    filters = filters.concat(buildFilters(OR[i]));
  }
  return filters;
}

module.exports = {
  Query: {
    allLinks: async (root, { filter, first, skip }, { mongo: { Links }, user }) => {
      let query = filter ? { $or: buildFilters(filter) } : {};
      const cursor = Links.find(query);
      if (first) {
        cursor.limit(first);
      }
      if (skip) {
        cursor.skip(skip);
      }
      return cursor.toArray();
    },
    allWorkspaces: async (root, data, { mongo: { Workspaces }, user }) => {
      const cursor = Workspaces.find({
        members: { $in: [user._id] },
        deleted: { $ne: true },
      });
      return cursor.toArray();
    },
    myActions: async (root, { workspace, filters = {} }, { mongo: { Actions, Workspaces }, user }) => {
      const query = {
        workspace,
        assignees: user._id,
        deleted: { $ne: true },
        archived: { $ne: true },
        isRecurringVisible: { $ne: false },
        checked: { $ne: true },
      };
      const options = { sort: { rank: 1 } };
      if (filters.actionType === 'completed') {
        query.checked = true;
        query.checkedDate = { $ne: null };
        options.sort = { checkedDate: -1, rank: 1 };
      }
      const cursor = Actions.find(query, options);
      return {
        actions: cursor.toArray(),
        count: cursor.count()
      };
    },
    actionsForView: async (root, { actionViewId, columnId, limit = 15 }, { mongo: { ActionViews, Actions, Workspaces }, user }) => {
      const actionView = await ActionViews.findOne({ _id: actionViewId });
      const { workspace, labels, assignees, sortType, projectId, projects = [] } = actionView;
      // TODO: Get view type for user (layout for user from user settings)
      const viewType = actionView.viewType;
      const getPrivacyClause = userId => [
        { privacy: 'public' },
        { privacy: 'private', assignees: userId },
      ];
      const query = {
        workspace,
        deleted: { $ne: true },
        // recurring actions
        $and: [{
          $or: [
            { isRecurringVisible: true, recurringId: { $ne: null } },
            { recurringId: null },
          ],
        }, {
          // Private and assigned to
          // this user or public.
          $or: getPrivacyClause(user._id),
        }],
      };
      if (projectId) {
        // Ensure access to project
        query.projectId = projectId;
      }
      switch (viewType) {
        case 'progress':
          query.status = columnId;
          query.checked = columnId === 'Completed' ? true : { $ne: true };
          break;
        default:
          break;
      }
      const options = { sort: { rank: 1 }, limit };
      return await Actions.find(query, options).toArray();
    },
  },
  Mutation: {
    createLink: async (root, data, { mongo: { Links }, user }) => {
      assertValidLink(data);
      const newLink = { postedById: user && user._id, createdAt: new Date(), ...data };
      const response = await Links.insert(newLink);
      newLink.id = response.insertedIds[0];

      // Push event to pubsub
      pubsub.publish('Link', { Link: { mutation: 'CREATED', node: newLink } });

      return newLink;
    },
    // NOTE: Not used anymore. Was used with old ./src/auth/authenticate.
    // Maybe replace with Meteor signin, but leave for now.
    createUser: async (root, data, { mongo: { Users } }) => {
      // Convert the given arguments into the format for the
      // `User` type, grabbing email and password from the "authProvider".
      const newUser = {
        name: data.name,
        email: data.authProvider.email.email,
        password: data.authProvider.email.password,
      };
      const response = await Users.insert(newUser);
      return { id: response.insertedIds[0], ...newUser };
    },
    // NOTE: Not used anymore. Was used with old ./src/auth/authenticate.
    // Maybe replace with Meteor signin, but leave for now.
    signinUser: async (root, data, { mongo: { Users } }) => {
      const user = await Users.findOne({ email: data.email.email });
      if (data.email.password === user.password) {
        return { token: `token-${user.email}`, user };
      }
    },
    createVote: async (root, data, { mongo: { Votes }, user }) => {
      const newVote = {
        userId: user && user._id,
        linkId: new ObjectID(data.linkId),
      };
      const response = await Votes.insert(newVote);
      return { id: response.insertedIds[0], ...newVote };
    },
  },
  Subscription: {
    Link: {
      subscribe: () => pubsub.asyncIterator('Link'),
    },
  },
  Link: {
    // Convert the "_id" field from MongoDB to "id" from the schema.
    id: root => root._id || root.id,
    // Use data loader if key value is present, otherwise return null
    postedBy: async ({ postedById }, data, { dataloaders: { userLoader } }) => {
      return await postedById ? userLoader.load(postedById) : null;
    },
    votes: async ({ _id }, data, { mongo: { Votes } }) => {
      return await Votes.find({ linkId: _id }).toArray();
    },
  },
  Action: {
    // Convert the "_id" field from MongoDB to "id" from the schema.
    id: root => root._id || root.id,
    // assignees...
    description: ({ description }) => {
      return description ? description : '';
    },
  },
  Workspace: {
    // Convert the "_id" field from MongoDB to "id" from the schema.
    id: root => root._id || root.id,
    members: async ({ _id, name, members = [] }, data, { dataloaders: { userLoader } }) => {
      return await members.length ? userLoader.loadMany(members) : [];
    },
  },
  User: {
    // Convert the "_id" field from MongoDB to "id" from the schema.
    id: root => root._id || root.id,
    name: ({ profile }) => {
      // Combine first and last names
      if (profile.firstName && profile.lastName) {
        return `${profile.firstName} ${profile.lastName}`;
      }
      return '';
    },
    email: ({ emails }) => {
      return emails[0] ? emails[0].address : '';
    },
    votes: async ({ _id }, data, { mongo: { Votes } }) => {
      return await Votes.find({ userId: _id }).toArray();
    },
  },
  Vote: {
    // Convert the "_id" field from MongoDB to "id" from the schema.
    id: root => root._id || root.id,
    // Use data loader if key value is present, otherwise return null
    user: async ({ userId }, data, { dataloaders: { userLoader } }) => {
      return await userId ? userLoader.load(userId) : null;
    },
    link: async ({ linkId }, data, { mongo: { Links } }) => {
      return await Links.findOne({ _id: linkId });
    },
  },
};
