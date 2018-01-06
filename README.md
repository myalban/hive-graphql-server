# Getting started

## Local Development
1. Clone the repository
2. Run `npm install`
3. Install Redis if you don't already have it `brew install redis`
4. Start Redis server `redis-server`
5. Start your local Hive meteor application (this will start mongo at port 3001)
6. Start the express server by running `npm run dev`

## Environment variables
We're using a .env file to capture environment variables. Copy the sample [.env.sample] file and save as `.env` with values filled in.

## Docker (Tentative)
1. Install docker
1. Run `docker build -t graphql --build-arg ssh_prv_key="$(cat ~/.ssh/id_rsa)" --build-arg ssh_pub_key="$(cat ~/.ssh/id_rsa.pub)" .`
2. Run `docker run -p 3030:3030 graphql`

# Overview
This is a proof of concept built off of an earlier example application using [apollo-server-express](https://github.com/apollographql/apollo-server). If you're not familiar with GraphQL + Express, I would take 2-3 hours to run through that tutorial - it will help you reason about this server better.

## Notes/to-dos
- Gist has info on setup, merge into here when ready
- Fake data gen
- Figure out Date types (string likely won't cut it)
- Need to maybe support JWT on Express + Meteor boxes so we don't have to re-query for user context every time
- Need to decide on Express --> Meteor requests and whether they'll forward jwt/meteor token
- Need to figure out Redis reconnect (right now express server dies and doesn't recover if redis goes down)
- Need to figure out Mongo reconnect (need to test, but I think express server craps out if mongo goes down and comes back up)
- Need to figure out how to call Meteor methods with context so we can say "yes, this method call is triggered by API - please do/don't fire pub sub event".
- Cross-client subscriptions - currently new messages/new group subscriptions filter out current user to avoid extra fetches, but if I send a message on web and have mobile open, my message won't appear there :-o


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
