import { makeExecutableSchema } from 'graphql-tools';

import resolvers from './resolvers';

const typeDefs = `
type Link {
  id: ID!
  url: String!
  description: String!
}

type Query {
  allLinks: [Link!]!
}
`;

module.exports = makeExecutableSchema({ typeDefs, resolvers });
