const { Query: ActionQuery, Mutation: ActionMutation, Action } = require('./action/resolvers');
const { File } = require('./file/resolvers');
const { Query: GroupQuery, Mutation: GroupMutation, Group, Subscription: GroupSubscription } = require('./group/resolvers');
const { Query: MessageQuery, Mutation: MessageMutation, Message, Subscription: MessageSubscription } = require('./message/resolvers');
const { Query: UserQuery, Mutation: UserMutation, User } = require('./user/resolvers');
const { UserSettings } = require('./user-settings/resolvers');

module.exports = {
  Query: Object.assign({}, ActionQuery, GroupQuery, MessageQuery, UserQuery),
  Mutation: Object.assign({}, ActionMutation, GroupMutation, MessageMutation, UserMutation),
  Subscription: Object.assign({}, GroupSubscription, MessageSubscription),
  Action,
  File,
  Group,
  Message,
  User,
  UserSettings,
};
