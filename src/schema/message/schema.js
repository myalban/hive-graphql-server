let Base;
let User;
let Action;
let File;
let Message;

module.exports = () => [Message, File, Action, User, Base];

Base = require('../base');
User = require('../user/schema');
Action = require('../action/schema');
File = require('../file/schema');

Message = `
  extend type Subscription {
    messageAdded(workspace: String!, groupIds: [String]): Message
    messageChanged(workspace: String!, groupIds: [String]): Message
  }
  
  extend type Mutation {
    insertMessage(workspace: String!, groupId: String!, body: String!): Message
    # Deletes message by id
    deleteMessage(messageId: String!): Int
  }
  
  type Message {
    _id: ID!
    body: String!
    workspace: String!
    from: User!
    sender: String!
    containerId: String!
    senderFirstName: String!
    senderPicture: String!
    deleted: Boolean!
    edited: Boolean!
    automated: Boolean!
    to: Group!
    files: [File]!
    actions: [Action]!
    reactions: [Reaction]!
    mentions: [User]!
    modifiedAt: String
    createdBy: String
    createdAt: String
    modifiedBy: String
  }

  type Reaction {
    emoji: String!
    userId: String!
    user: User
  }

  type MessageConnection {
    edges: [MessageEdge]
    pageInfo: PageInfo!
  }
  
  type MessageEdge {
    cursor: String!
    node: Message!
  }
`;
