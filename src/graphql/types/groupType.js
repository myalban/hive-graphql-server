export default`
  type Group {
    _id: ID! # unique id for the group
    workspace: String!
    name: String # name of the group
    users: [User]! # users in the group
    messages(first: Int, after: String, last: Int, before: String, sortField: String, sortOrder: Int): MessageConnection
  }

  type Query {
    # Return a group by id
    group(_id: String!): Group
  }

  type Mutation {
    insertGroup(workspace: String!, members: [String!]!, name: String, oneToOne: Boolean!, projectId: String): Group
    leaveGroup(_id: String!): Group
    deleteGroup(_id: String!): Group
  }
  
  type Subscription {
    groupAdded(workspace: String!): Group
  }
`;
