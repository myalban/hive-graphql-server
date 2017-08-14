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
  },
  Link: {
    // Convert the "_id" field from MongoDB to "id" from the schema.
    id: root => root._id || root.id,
    postedBy: async ({ postedById }, data, { mongo: { Users } }) => {
      return await Users.findOne({ _id: postedById });
    },
  },
  User: {
    // Convert the "_id" field from MongoDB to "id" from the schema.
    id: root => root._id || root.id,
  },
};
