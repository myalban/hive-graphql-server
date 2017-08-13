import express from 'express';
import bodyParser from 'body-parser';
import { graphqlExpress } from 'apollo-server-express';

import schema from './schema';

const app = express();

// Set up Graphql endpoint and middleware
app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`HN GraphQL server started at http://localhost:${PORT}`);
});
