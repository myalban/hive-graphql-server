export default`
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

  enum FileStore {
    GOOGLE
    DROPBOX
    HIVE
    BOX
  }
  
  type File {
    _id: ID!
    url: String!
    thumbnail: String
    fileStore: FileStore!
    type: String # file or directory
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
  
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  type Mutation {
    insertMessage(workspace: String!, groupId: String!, body: String!): Message
  }
  
  type Subscription {
    messageAdded(workspace: String!, groupIds: [String]): Message
    messageChanged(workspace: String!, groupIds: [String]): Message
  }
`;
