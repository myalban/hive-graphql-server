let Base;
let Group;
let UserSettings;

module.exports = () => [UserSettings, Group, Base];

Base = require('../base');
Group = require('../group/schema');

UserSettings = `
  type UserSettings {
    _id: ID! # unique id for the user settings
    userId: String! # userId these settings belong to
    workspace: String! # workspace id these settings belong to
    hiddenGroups: [Group]! # array of groups to hide
  }
`;
