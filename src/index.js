import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';

import schema from './schema';
import connectMongo from './mongo-connector';
import buildDataloaders from './dataloaders';
import { authenticate } from './authentication';

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
  }));

  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`HN GraphQL server started at http://localhost:${PORT}`);
  });
};

start();
