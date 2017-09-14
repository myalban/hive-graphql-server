# Getting started
1. Clone the repository
2. Run `npm install`
3. Start your local Hive meteor application (we need the database running)
4. [Temporary] Start a local mongo instance by running `mongod`
5. Start the express server by running `npm start`

# Overview
This is a proof of concept built off of an earlier example application using [apollo-server-express](https://github.com/apollographql/apollo-server). It has a few sample resolvers from the [Hacker News example it's stemmed off of](https://www.howtographql.com/graphql-js/1-getting-started/). If you're not familiar with GraphQL + Express, I would take 2-3 hours to run through that tutorial - it will help you reason about this server better.

# Hive GraphQL server roadmap

## Short term objectives
- [x] Default to open source
- [x] Recreate query for "My actions" view in GraphQL
- [x] Connect Meteor front-end to GraphQL server back-end for **loading data** into "My actions" view
- [x] Connect Meteor front-end to GraphQL server back-end for **mutating data** with optimistic UI on "My actions" view

## Long term objectives
- [ ] Make API public
- [ ] Swap front-end with Apollo or Relay Modern in Hive UI

## High level setup
- [x] Basic Meteor authentication based on localStorage token
- [x] Add linter
- [ ] Add basic tests
- [ ] Migrate select collections
- [x] Authorization (node-based, not edge-based) based on user. [See this](https://dev-blog.apollodata.com/auth-in-graphql-part-2-c6441bcc4302) and [this](http://graphql.org/learn/authorization/) for explanation. Finally, there are some good examples/descriptions around separating business layer logic [in this post.](https://medium.com/@simontucker/building-chatty-part-7-authentication-in-graphql-cd37770e5ab3)
- [ ] Decide on how to split resolvers and schema into separate files
- [ ] Deployment strategy
- [x] Figure out client-side client config
- [x] Figure out Support Mode
- [ ] Add stress tests/benchmarking
- [ ] Set up a screen share learning session for whole team

## Outstanding questions (and tentative answers)
- Do we want to move methods over to mutations?
  - Use existing Meteor api to call existing Methods from mutations so we don't rewrite logic. For example, a mutation for "updateTitle" will make an API call from GraphQL server to a Meteor server to call the method, wait on results, then return data.
- On actions.forView, do we want to keep the same "single column = single query/subscription"?
  - Yes.

## Best practices for success
To make sure the outcome both meets business needs and ensures a good developer workflow, we want to always compare the progress of the repo to the following:

- Prevent developer bottlenecks (e.g. anybody can jump into the codebase and contribute immediately)
- Follow standard coding styles (linting, separation of concerns)
- Ensure the code is testable
- Ensure we have appropriate time to refactor after solving a given problem so that the code follows above best practices
