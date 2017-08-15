import { ObjectID } from 'mongodb';

module.exports = {
  Query: {
    allLinks: async (root, data, { mongo: { Links }, user }) => {
      return await Links.find({}).toArray();
    },
  },
  Mutation: {
    createLink: async (root, data, { mongo: { Links }, user }) => {
      const newLink = { postedById: user && user._id, ...data };
      const response = await Links.insert(newLink);
      return { id: response.insertedIds[0], ...newLink };
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
