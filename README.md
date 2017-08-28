# Getting started
1. Clone the repository
2. Run `npm install`
3. Start your local Hive meteor application (we need the database running)
4. [Temporary] Start a local mongo instance by running `mongod`
5. Start the express server by running `npm start`

# Overview
This is a proof of concept built off of an earlier example application using [apollo-server-express](https://github.com/apollographql/apollo-server). It has a few sample resolvers from the [Hacker News example it's stemmed off of](https://www.howtographql.com/graphql-js/1-getting-started/). If you're not familiar with GraphQL + Express, I would take 2-3 hours to run through that tutorial - it will help you reason about this server better.

# Hive GraphQL server roadmap
- [x] Basic Meteor authentication based on localStorage token
- [ ] Add linter
- [ ] Add basic tests
- [ ] Migrate select collections
- [ ] Authorization (node-based, not edge-based) based on user. [See this](https://dev-blog.apollodata.com/auth-in-graphql-part-2-c6441bcc4302) and [this](http://graphql.org/learn/authorization/) for explanation. Finally, there are some good examples/descriptions around separating business layer logic [in this post.](https://medium.com/@simontucker/building-chatty-part-7-authentication-in-graphql-cd37770e5ab3)
- [ ] Decide on how to split resolvers and schema into separate files
- [ ] Deployment strategy
- [ ] Figure out client-side client config
- [ ] Figure out Impersonate
