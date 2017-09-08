import { makeExecutableSchema } from 'graphql-tools';

import resolvers from './resolvers';

const typeDefs = `
type Link {
  id: ID!
  url: String!
  description: String!
  createdAt: String!
  postedBy: User
  votes: [Vote!]!
}

type Workspace {
  id: ID!
  name: String!
  members: [User!]!
}

type AncestorAttributes {
  id: ID!
  title: String!
  status: String!
  assignees: [String!]!
  labels: [String!]!
}

type Attachments {
  id: ID!
  type: String!
}

type CustomFields {
  id: ID!
  type: String!
  label: String!
  value: String
}

type GanttExpanded {
  userId: ID!
  open: Boolean
  actionViewId: String
}

type Action {
  _id: ID!
  title: String!
  description: String!
  workspace: String!
  status: String!
  assignees: [String!]!
  labels: [String!]!
  checked: Boolean!
  deleted: Boolean!
  formAction: String
  checkedDate: String
  createdAt: String
  rank: Float
  scheduledDate: String
  deadline: String
  parent: String
  ancestorAttributes: [AncestorAttributes]
  root: String
  privacy: String
  processId: String
  projectId: String
  attachments: [Attachments]
  readBy: [String]
  urgent: Boolean
  hasComments: Boolean
  hasSubactions: Boolean
  allSubactions: Int
  checkedSubactions: Int
  lastMessage: String
  messageId: String
  assignedBy: String
  completedBy: String
  recurringId: String
  isRecurringVisible: Boolean
  bucket: String
  newAction: Boolean
  archived: Boolean
  hasHistory: Boolean
  modifiedAt: String
  createdBy: String
  modifiedBy: String
  snoozeDate: String
  ganttExpanded: [GanttExpanded]
}

input ActionInput {
  _id: ID!
  title: String
  description: String!
  workspace: String!
  status: String!
  assignees: [String!]!
  labels: [String!]!
  checked: Boolean!
  deleted: Boolean!
  formAction: String
  checkedDate: String
  createdAt: String
  rank: Float
  scheduledDate: String
  deadline: String
  parent: String
  root: String
  privacy: String
  processId: String
  projectId: String
  readBy: [String]
  urgent: Boolean
  hasComments: Boolean
  hasSubactions: Boolean
  allSubactions: Int
  checkedSubactions: Int
  lastMessage: String
  messageId: String
  assignedBy: String
  completedBy: String
  recurringId: String
  isRecurringVisible: Boolean
  bucket: String
  newAction: Boolean
  archived: Boolean
  hasHistory: Boolean
  modifiedAt: String
  createdBy: String
  modifiedBy: String
  snoozeDate: String
}


type Query {
  allLinks(filter: LinkFilter, skip: Int, first: Int): [Link!]!
  allWorkspaces: [Workspace!]!
  myActions(workspace: String!, filters: MyActionsFilter, limit: Int, skip: Int): ActionList!
  actionList(name: String!, viewId: String, workspace: String!, filters: MyActionsFilter, limit: Int, skip: Int): ActionList!
  # Okay so, do we:
  # √ Pass action view id one by one columns?
  # - Pass action view id with limits per column? (e.g. return all at once)
  # - Something else?
  actionsForView(actionViewId: String!, columnId: String!): [Action!]!
}

type MyActionsPayload {
  actions: [Action!]!
  count: Int
}

type ActionList {
  actions: [Action!]!
  count: Int
}

input MyActionsFilter {
  actionType: String
  sortType: String
}

input LinkFilter {
  OR: [LinkFilter!]
  description_contains: String
  url_contains: String
}

type Mutation {
  updateAction(action: ActionInput): Action!
  checkAction(_id: String!): Action!
  uncheckAction(_id: String!): Action!
  createLink(url: String!, description: String!): Link
  createVote(linkId: ID!): Vote
  # Neither is used at the moment. Meteor will handle these.
  createUser(name: String!, authProvider: AuthProviderSignupData!): User
  signinUser(email: AUTH_PROVIDER_EMAIL): SignInPayload!
}

# Unused at the moment. Meteor will handle these.
input AuthProviderSignupData {
  email: AUTH_PROVIDER_EMAIL
}
# Unused at the moment. Meteor will handle these.
input AUTH_PROVIDER_EMAIL {
  email: String!
  password: String!
}

type User {
  id: ID!
  name: String!
  email: String
  votes: [Vote!]!
}

type SignInPayload {
  token: String
  user: User
}

type Vote {
  id: ID!
  user: User!
  link: Link!
}

type Subscription {
  Link(filter: LinkSubscriptionFilter): LinkSubscriptionPayload
}

input LinkSubscriptionFilter {
  mutation_in: [_ModelMutationType!]
}

type LinkSubscriptionPayload {
  mutation_in: _ModelMutationType!
  node: Link
}

enum _ModelMutationType {
  CREATED
  UPDATED
  DELETED
}
`;

module.exports = makeExecutableSchema({ typeDefs, resolvers });
