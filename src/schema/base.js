let Base;

module.exports = () => [Base];

Base = `
type Query {
  dummy: Boolean
}

type Subscription {
  dummy: Boolean
}

type Mutation {
  dummy: Boolean
}

type Meta {
  count: Int
}

scalar Url
scalar Date

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
}
`;

