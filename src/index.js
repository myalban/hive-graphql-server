import 'babel-polyfill';
import pm2 from 'pm2';
import OpticsAgent from 'optics-agent';
import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import checkAuth from 'hive-graphql-auth';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { execute, subscribe } from 'graphql';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { NotAuthorized } from './errors/not-authorized';
import schema from './schema';
import connectMongo from './mongo-connector';
import buildDataloaders from './dataloaders';
import formatError from './utils/format-error';
import { LOCAL_JWT, JWT_SECRET } from './config';

const PORT = process.env.PORT || 3030;

const start = async () => {
  const mongo = await connectMongo();
  const app = express();

  // Global middleware
  app.use(morgan('dev'));

  // Set up shared context
  const buildOptions = async (req) => {
    const authorization = req.headers.authorization;
    const user = await checkAuth(authorization, { Users: mongo.Users, JWT_SECRET });
    if (!user) {
      throw new NotAuthorized();
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
    // console.log(req);
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // basic health check
  app.use('/healthcheck', (req, res) => {
    let ok = false;
    pm2.list((err, results) => {
      results.forEach((instance) => {
        if (instance.pm2_env.status === 'online') {
          ok = true;
        }
      });

      if (ok) {
        return res.sendStatus(200);
      }

      return res.sendStatus(500);
    });
  });

  app.use(OpticsAgent.middleware());
  // Set up Graphql endpoint and middleware
  app.use('/graphql', bodyParser.json(), graphqlExpress(buildOptions));

  // GraphiQL
  app.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
    // Use tokens from local env for GraphiQL
    passHeader: `
      'Authorization': 'Bearer ${LOCAL_JWT}',
    `,
    // If you want to use Meteor token, uncomment below:
    // passHeader: `
    //   'Authorization': 'Bearer meteor-${LOCAL_METEOR_TOKEN}',
    // `,
    subscriptionsEndpoint: `ws://localhost:${PORT}/subscriptions`,
  }));

  const server = createServer(app);
  server.listen(PORT, () => {
    // Start WS subscription server
    SubscriptionServer.create(
      {
        execute,
        subscribe,
        schema,
        onConnect: async ({ authToken, useMeteorToken }, webSocket) => {
          let user;
          // TODO: Pass auth token from client or GraphiQL
          if (authToken) {
            const authHeader = `Bearer ${useMeteorToken ? 'meteor-' : ''}${authToken}`;
            user = await checkAuth(authHeader, { Users: mongo.Users, JWT_SECRET });
          } else {
            // For now hard code email address for use in GraphiQL
            user = await mongo.Users.findOne({ 'emails.address': 'sillybilly@site.com' });
          }
          return { user, mongo };
          // throw new Error('Missing auth token!');
        },
      },
      { server, path: '/subscriptions' },
    );
    console.log(`Hive GraphQL server started at http://localhost:${PORT}`);
  });
};

start();
