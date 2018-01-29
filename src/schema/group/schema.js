let Base;
let User;
let Message;
let Group;

module.exports = () => [Group, Message, User, Base];

Base = require('../base');
User = require('../user/schema');
Message = require('../message/schema');

Group = `
  extend type Query {
    # Return a group by id
    group(_id: String!): Group
  }

  extend type Subscription {
    groupAdded(workspace: String!): Group
    # Tracks changes in group
    groupChanged(workspace: String!): Group
  }

  extend type Mutation {
    insertGroup(workspace: String!, members: [String!]!, name: String, oneToOne: Boolean!, projectId: String): Group
    leaveGroup(_id: String!): Group
    deleteGroup(_id: String!): Group
  }

  type Group {
    _id: ID! # unique id for the group
    workspace: String!
    name: String # name of the group
    users: [User]! # users in the group
    messages(first: Int, after: String, last: Int, before: String, sortField: String, sortOrder: Int): MessageConnection
  }
`;
