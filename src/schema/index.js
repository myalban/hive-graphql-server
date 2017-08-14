import { makeExecutableSchema } from 'graphql-tools';

import resolvers from './resolvers';

const typeDefs = `
type Link {
  id: ID!
  url: String!
  description: String!
  postedBy: User
}

type Query {
  allLinks: [Link!]!
}

type Mutation {
  createLink(url: String!, description: String!): Link
  createUser(name: String!, authProvider: AuthProviderSignupData!): User
  signinUser(email: AUTH_PROVIDER_EMAIL): SignInPayload!
}

type User {
  id: ID!
  name: String!
  email: String
}

input AuthProviderSignupData {
  email: AUTH_PROVIDER_EMAIL
}

input AUTH_PROVIDER_EMAIL {
  email: String!
  password: String!
}

type SignInPayload {
  token: String
  user: User
}
`;

module.exports = makeExecutableSchema({ typeDefs, resolvers });
