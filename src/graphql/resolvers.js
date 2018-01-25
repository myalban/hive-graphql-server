import { mergeResolvers } from 'merge-graphql-schemas';
import actionResolver from './resolvers/actionResolver';
import groupResolver from './resolvers/groupResolver';
import messageResolver from './resolvers/messageResolver';
import userResolver from './resolvers/userResolver';

const resolvers = [
  actionResolver,
  groupResolver,
  messageResolver,
  userResolver,
];

export default mergeResolvers(resolvers);
