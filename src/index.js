import express from 'express';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';

import schema from './schema';

const app = express();

// Global middleware
app.use(morgan('dev'));

// Set up Graphql endpoint and middleware
app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }));

// GraphiQL
app.use('/graphiql', graphiqlExpress({
  endpointURL: '/graphql',
}));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`HN GraphQL server started at http://localhost:${PORT}`);
});
