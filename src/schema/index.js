import { makeExecutableSchema } from 'graphql-tools';

import resolvers from './resolvers';

const typeDefs = `
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
  description: String
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

input AttachmentsInput {
  id: ID!
  type: String!
}

input ActionInput {
  _id: ID!
  title: String
  description: String
  workspace: String!
  status: String!
  attachments: [AttachmentsInput]
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

input ActionAttrsInput {
  title: String
  description: String
  workspace: String
  status: String
  attachments: [AttachmentsInput]
  assignees: [String]
  labels: [String]
  checked: Boolean
  deleted: Boolean
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
  actionList(name: String!, viewId: String, workspace: String!, filters: ActionListFilter, limit: Int, skip: Int): ActionList!
  # Return a user by their email or id
  user(email: String, _id: String): User
  # Return a group by id
  group(_id: String!): Group
}

type ActionList {
  actions: [Action!]!
  count: Int
}

input ActionListFilter {
  actionType: String
  sortType: String
}

type Message {
  _id: ID!
  body: String!
  workspace: String!
  from: User!
  to: Group!
  modifiedAt: String
  createdBy: String
  createdAt: String
  modifiedBy: String
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

type Group {
  _id: ID! # unique id for the group
  workspace: String!
  name: String # name of the group
  users: [User]! # users in the group
  messages(first: Int, after: String, last: Int, before: String, sortField: String, sortOrder: Int): MessageConnection
}

type User {
  _id: ID! # unique id for the user
  jwt: String # json web token for access
  email: String! # user email address
  firstName: String! # user first name
  lastName: String! # user last name
  username: String! # This is the name we'll show other users (actually a users full name)
  messages: [Message] # messages sent by user
  groups(workspace: ID): [Group] # groups the user belongs to
  coworkers(workspace: ID): [User] # Users this user shares workspace(s) with
  lastWorkspace: String # last workspace accessed by user
  settings(workspace: ID): UserSettings # settings for this user and this workspace
  photo: String # Photo to display for user
  status: String! # User status ('away', 'offline', 'online')
}

type UserSettings {
  _id: ID! # unique id for the user settings
  userId: ID! # userId these settings belong to
  workspace: ID! # workspace id these settings belong to
  hiddenGroups: [Group]! # array of groups to hide
}

type Mutation {
  login(email: String!, password: String!): User
  insertAction(action: ActionInput, aboveActionId: String, belowActionId: String): Action!
  updateAction(action: ActionInput): Action!
  updateActionChildrenChecked(actionId: String!, checked: Boolean!): Boolean
  updateActionChecked(actionId: String!, checked: Boolean!): Action
  updateActionTitle(actionId: String!, title: String!): Action
  updateActionChildren(actionId: String!, attrs: ActionAttrsInput!): Action
  insertMessage(workspace: String!, groupId: String!, body: String!): Message
  insertGroup(workspace: String!, members: [String!]!, name: String, oneToOne: Boolean!, projectId: String): Group
  leaveGroup(_id: String!): Group
  deleteGroup(_id: String!): Group
  updateUserStatus(status: UserStatusEnum!): UserStatusEnum
}

type Subscription {
  messageAdded(workspace: String!, groupIds: [String]): Message
  messageChanged(workspace: String!, groupIds: [String]): Message
  groupAdded(workspace: String!): Group
}

enum UserStatusEnum {
  online
  offline
  away
}

enum _ModelMutationType {
  CREATED
  UPDATED
  DELETED
}
`;

module.exports = makeExecutableSchema({ typeDefs, resolvers });
