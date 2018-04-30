import { makeExecutableSchema } from 'graphql-tools';
import Base from './base';
import Action from './action/schema';
import File from './file/schema';
import Group from './group/schema';
import ActivityFeed from './activity-feed/schema';
import Message from './message/schema';
import User from './user/schema';
import UserSettings from './user-settings/schema';
import resolvers from './resolvers';

module.exports = makeExecutableSchema({
  typeDefs: [
    Base,
    Action,
    File,
    Group,
    ActivityFeed,
    Message,
    User,
    UserSettings,
  ],
  resolvers,
});
