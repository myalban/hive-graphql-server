import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { execute, subscribe } from 'graphql';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';

import schema from './schema';
import connectMongo from './mongo-connector';
import buildDataloaders from './dataloaders';
import { authenticate } from './authentication';
import formatError from './format-error';

const PORT = 3000;

const start = async () => {
  const mongo = await connectMongo();
  const app = express();

  // Global middleware
  app.use(morgan('dev'));

  // Set up shared context
  const buildOptions = async (req, res) => {
    const user = await authenticate(req, mongo.Users);
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

  // Set up Graphql endpoint and middleware
  app.use('/graphql', bodyParser.json(), graphqlExpress(buildOptions));

  // GraphiQL
  app.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
    // Temporary -- force unsafe token
    passHeader: `'Authorization': 'bearer token-eric@hive.com'`,
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

start();
