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
}

type ActionList {
  actions: [Action!]!
  count: Int
}

input ActionListFilter {
  actionType: String
  sortType: String
}

type Mutation {
  insertAction(action: ActionInput, aboveActionId: String, belowActionId: String): Action!
  updateAction(action: ActionInput): Action!
  updateActionChildrenChecked(actionId: String!, checked: Boolean!): Boolean
  updateActionChecked(actionId: String!, checked: Boolean!): Action
  updateActionTitle(actionId: String!, title: String!): Action
  updateActionChildren(actionId: String!, attrs: ActionAttrsInput!): Action
}

enum _ModelMutationType {
  CREATED
  UPDATED
  DELETED
}
`;

module.exports = makeExecutableSchema({ typeDefs, resolvers });
