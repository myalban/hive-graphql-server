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

type Action {
  id: ID!
  title: String!
  description: String!
  workspace: Workspace!
  status: String!
  # Use a fragment here for 'none'?
  # Considering other data will come from
  # Meteor subscriptions, might be best to
  # leave these as is instead of inrospective.
  assignees: [String!]!
  labels: [String!]!
}

type Query {
  allLinks(filter: LinkFilter, skip: Int, first: Int): [Link!]!
  allWorkspaces: [Workspace!]!
  myActions(workspace: String!, filters: MyActionsFilter): MyActionsPayload!
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

input MyActionsFilter {
  actionType: String!
  # Limit and sort here?
}

input LinkFilter {
  OR: [LinkFilter!]
  description_contains: String
  url_contains: String
}

type Mutation {
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
