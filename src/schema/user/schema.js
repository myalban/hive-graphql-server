let Base;
let Action;
let File;
let Group;
let UserSettings;
let User;

module.exports = () => [User, Group, UserSettings, File, Action, Base];

Base = require('../base');
Action = require('../action/schema');
File = require('../file/schema');
Group = require('../group/schema');
UserSettings = require('../user-settings/schema');

User = `
  extend type Query {
    user(email: String, _id: String): User
  }

  extend type Mutation {
    login(email: String!, password: String!): User
    updateUserLastWorkspace(workspace: String!): User
    updateUserTimezone(timezone: String!): User
    updateUserOnlineStatus(status: UserStatusEnum!): User
  }

  type User {
    _id: ID! # unique id for the user
    jwt: String # json web token for access
    email: String! # user email address
    firstName: String! # user first name
    lastName: String! # user last name
    username: String! # This is the name we will show other users (actually a users full name)
    messages: [Message] # messages sent by user
    groups(workspace: ID): [Group] # groups the user belongs to
    coworkers(workspace: ID): [User] # Users this user shares workspace(s) with
    timezone: String
    lastWorkspace: String # last workspace accessed by user
    settings(workspace: ID): UserSettings # settings for this user and this workspace
    photo: String # Photo to display for user
    status: String! # User status ('away', 'offline', 'online')
    onboardingStage: OnboardingStageEnum! # user stage in onboarding
  }

  enum UserStatusEnum {
    online
    offline
    away
  }

  enum OnboardingStageEnum {
    invited
    info
    actions
    teammates
    files
    completed
  }
`;
