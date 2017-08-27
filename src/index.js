import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import crypto from 'crypto';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { execute, subscribe } from 'graphql';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';

import schema from './schema';
import connectMongo from './mongo-connector';
import buildDataloaders from './dataloaders';
import { authenticate } from './authentication';
import formatError from './utils/format-error';

const PORT = process.env.PORT || 3030;

const start = async () => {
  const mongo = await connectMongo();
  const app = express();

  // Global middleware
  app.use(morgan('dev'));

  // Set up shared context
  const buildOptions = async (req, res) => {
    // get the login token from the headers request, given by the Meteor's
    // network interface middleware if enabled
    const loginToken = req.headers['meteor-login-token'];
    // get the current user & the user id for the context
    let userContext = null;
    if (loginToken) {
      userContext = await getUserForContext(loginToken, mongo.Users);
    }
    const user = userContext ? userContext : await authenticate(req, mongo.Users);
    return {
      context: {
        mongo,
        user,
        // Use data loader instead of direct mongo calls
        // so we cache data across each request.
        dataloaders: buildDataloaders(mongo),
      },
      // Custom error formatting to show `field` if present.
      formatError,
      schema,
    };
  };

  // Enable CORS and handle 'OPTIONS' requests
  // since graphql only allows GET and POST requests.
  // NOTE: Is this correct? https://github.com/graphql/express-graphql/issues/14
  app.use('/graphql', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
  // Set up Graphql endpoint and middleware
  app.use('/graphql', bodyParser.json(), graphqlExpress(buildOptions));

  // GraphiQL
  app.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
    // Temporary -- force unsafe token
    passHeader: `
      'Authorization': 'bearer token-eric@hive.com',
      'meteor-login-token': 'bwF_l0qVt8zczkg9z9u63DuNdUSeniBuSrZJbOocW60'
    `,
    // passHeader: `'Authorization': localStorage['Meteor.loginToken']`,
    subscriptionsEndpoint: `ws://localhost:${PORT}/subscriptions`,
  }));

  const server = createServer(app);
  server.listen(PORT, () => {
    // Start WS subscription server
    SubscriptionServer.create(
      { execute, subscribe, schema },
      { server, path: '/subscriptions' }
    );
    console.log(`HN GraphQL server started at http://localhost:${PORT}`);
  });
};

const hashLoginToken = (loginToken) => {
  const hash = crypto.createHash('sha256');
  hash.update(loginToken);
  return hash.digest('base64');
};

export const getUserForContext = async (loginToken, Users) => {
  // there is a possible current user connected!
  if (loginToken) {
    // throw an error if the token is not a string
    // check(loginToken, String);
    if (typeof loginToken !== 'string') throw new Error('Login token must be string!');

    // the hashed token is the key to find the possible current user in the db
    // const hashedToken = Accounts._hashLoginToken(loginToken);
    const hashedToken = hashLoginToken(loginToken);

    // get the possible current user from the database
    const currentUser = await Users.findOne({
      'services.resume.loginTokens.hashedToken': hashedToken,
    });

    // the current user exists
    if (currentUser) {
      // find the right login token corresponding, the current user may have
      // several sessions logged on different browsers / computers
      const tokenInformation = currentUser.services.resume.loginTokens.find(
        tokenInfo => tokenInfo.hashedToken === hashedToken
      );

      // get an exploitable token expiration date
      // const expiresAt = Accounts._tokenExpiration(tokenInformation.when);
      const expiresAt = new Date('9/1/2019');

      // true if the token is expired
      const isExpired = expiresAt < new Date();

      // if the token is still valid, give access to the current user
      // information in the resolvers context
      if (!isExpired) {
        // return a new context object with the current user & her id
        return currentUser;
      }
    }
  }

  return {};
};


start();
