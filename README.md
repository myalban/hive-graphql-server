# Getting started

## Local Development
1. Clone the repository
2. Run `npm install`
3. Install Redis if you don't already have it `brew install redis`
4. Start Redis server `redis-server`
5. Start your local Hive meteor application (this will start mongo at port 3001)
6. Start the express server by running `npm run dev`

## Environment variables
We're using a .env file to capture environment variables. Copy the sample [.env.sample] file and save as `.env` with values filled in. These values are mostly just used when using GraphiQL to play with the schema. If you're building an actual application, you should call the `login` mutation and use the JWT returned from it for queries + subscriptions.

### JWT_SECRET
You can use any value you want in local development. JWT will use this secret to sign all requested tokens.

### GRAPHQL_URL
The url for this graphql server, can be localhost

### METEOR_URL
The url for the meteor app

### LOCAL_METEOR_USER
Email address used to act as a given user from GraphiQL for subscriptions only. To ensure accurate data, make sure the email you use here is the same as the email for the user you called login with to get your JWT used in LOCAL_JWT.

### MONGO_URL
### REDIS_URL
### REDIS_PORT
### REDIS_PASSWORD

## Graphiql
use ModHeader or a similar tool to add your jwt to your header:
https://chrome.google.com/webstore/detail/modheader/idgpnmonknjnojddfkpgkljpfnnfcklj/related

## Docker (Tentative)
1. Install docker
1. Run `docker build -t graphql --build-arg ssh_prv_key="$(cat ~/.ssh/id_rsa)" --build-arg ssh_pub_key="$(cat ~/.ssh/id_rsa.pub)" .`
2. Run `docker run -p 3030:3030 graphql`


## TODO
- [ ] Gist has info on setup, merge into here when ready
- [ ] Mock data
- [ ] Figure out Date types (string likely won't cut it)
- [ ] Redis reconnect
- [ ] Mongo reconnect (need to test, but I think express server craps out if mongo goes down and comes back up)
- [x] Basic Meteor authentication based on localStorage token
- [x] Add linter
- [ ] Add basic tests
- [x] Authorization (node-based, not edge-based) based on user. [See this](https://dev-blog.apollodata.com/auth-in-graphql-part-2-c6441bcc4302) and [this](http://graphql.org/learn/authorization/) for explanation. Finally, there are some good examples/descriptions around separating business layer logic [in this post.](https://medium.com/@simontucker/building-chatty-part-7-authentication-in-graphql-cd37770e5ab3)
- [ ] Decide on how to split resolvers and schema into separate files
- [ ] Deployment strategy
- [x] Figure out client-side client config
- [x] Figure out Support Mode
- [ ] Add stress tests/benchmarking

