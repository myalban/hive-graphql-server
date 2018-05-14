import 'babel-polyfill';
// import pm2 from 'pm2';
import OpticsAgent from 'optics-agent';
import express from 'express';
import bodyParser from 'body-parser';
import morganBody from 'morgan-body';
import checkAuth from 'hive-graphql-auth';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { execute, subscribe } from 'graphql';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
// import { NotAuthorized } from './errors/not-authorized';
import { JWT_SECRET, GRAPHQL_URL, LOCAL_METEOR_USER } from './config';
import logger from './utils/logger';
import environment from './utils/environment-helpers';
import connectMongo from './mongo-connector';
import buildDataloaders from './dataloaders';
import formatError from './utils/format-error';
import schema from './schema';

const PORT = process.env.PORT || 3030;
const SUBSCRIPTIONS_EP = environment.isDev() ?
  `ws://localhost:${PORT}/subscriptions` :
  `wss://${GRAPHQL_URL}/subscriptions`;


const start = async () => {
  const mongo = await connectMongo();
  const app = express();

  // Global middleware
  morganBody(app, {
    skip(req) {
      // Exclude healthchecks
      return req.originalUrl.includes('healthcheck');
    },
    stream: logger.stream,
  });

  // Set up shared context
  const buildOptions = async (req) => {
    const authorization = req.headers.authorization;
    let user;
    if (typeof authorization !== 'undefined') {
      user = await checkAuth(authorization, { Users: mongo.Users, JWT_SECRET });
    }

    // set user context if localhost
    if (!user && LOCAL_METEOR_USER) {
      user = await mongo.Users.findOne({ 'emails.address': LOCAL_METEOR_USER });
    }

    return {
      context: {
        req,
        mongo,
        user,
        // Use data loader instead of direct mongo calls
        // so we cache data across each request.
        dataloaders: buildDataloaders(mongo),
        opticsContext: OpticsAgent.context(req),
      },
      // Custom error formatting to show `field` if present.
      formatError,
      schema: OpticsAgent.instrumentSchema(schema),
    };
  };

  // Enable CORS and handle 'OPTIONS' requests
  // since graphql only allows GET and POST requests.
  // NOTE: Is this correct? https://github.com/graphql/express-graphql/issues/14
  app.use('/graphql', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, email');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // basic health check
  app.use('/healthcheck', (req, res) => {
    // NOTE: For now, don't use pm2 for health check since we only have single items in cluster.
    // let ok = false;
    // pm2.list((err, results) => {
    //   results.forEach((instance) => {
    //     if (instance.pm2_env.status === 'online') {
    //       ok = true;
    //     }
    //   });

    //   if (ok) {
    //     return res.sendStatus(200);
    //   }

    //   return res.sendStatus(500);
    // });
    res.sendStatus(200);
  });

  app.use(OpticsAgent.middleware());
  // Set up Graphql endpoint and middleware
  app.use('/graphql', bodyParser.json(), graphqlExpress(buildOptions));

  // GraphiQL
  app.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
    // Use tokens from local env for GraphiQL
    // If you want to use Meteor token, uncomment below:
    // passHeader: `
    //   'Authorization': 'Bearer meteor-${LOCAL_METEOR_TOKEN}',
    // `,
    subscriptionsEndpoint: SUBSCRIPTIONS_EP,
  }));

  const server = createServer(app);
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    // Start WS subscription server
    SubscriptionServer.create(
      {
        execute,
        subscribe,
        schema,
        onConnect: async ({ authToken, useMeteorToken }) => {
          let user;
          // TODO: Pass auth token from client or GraphiQL
          if (authToken) {
            const authHeader = `Bearer ${useMeteorToken ? 'meteor-' : ''}${authToken}`;
            user = await checkAuth(authHeader, { Users: mongo.Users, JWT_SECRET });
          } else {
            // For now use email address from LOCAL_METEOR_USER
            // to act as that user during subscriptions.
            user = await mongo.Users.findOne({ 'emails.address': LOCAL_METEOR_USER });
          }
          return { user, mongo };
          // throw new Error('Missing auth token!');
        },
      },
      { server, path: '/subscriptions' },
    );
    logger.info('Hive GraphQL server started');
  });
};

start();
