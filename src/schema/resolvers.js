import { ObjectID } from 'mongodb';
import { URL } from 'url';
import pubsub from '../pubsub';

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

function assertValidLink ({ url }) {
  try {
    new URL(url);
  } catch (error) {
    throw new ValidationError(`Link validation error: invalid url ${url}`, 'url');
  }
};

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
    allLinks: async (root, { filter }, { mongo: { Links }, user }) => {
      let query = filter ? { $or: buildFilters(filter) } : {};
      return await Links.find(query).toArray();
    },
  },
  Mutation: {
    createLink: async (root, data, { mongo: { Links }, user }) => {
      assertValidLink(data);
      const newLink = { postedById: user && user._id, ...data };
      const response = await Links.insert(newLink);
      newLink.id = response.insertedIds[0];

      // Push event to pubsub
      pubsub.publish('Link', { Link: { mutation: 'CREATED', node: newLink } });

      return newLink;
    },
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
    // TODO: Use JWT instead
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
  User: {
    // Convert the "_id" field from MongoDB to "id" from the schema.
    id: root => root._id || root.id,
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
