import _ from 'lodash';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import SHA256 from '../../meteor-helpers/sha256';
import { JWT_SECRET } from '../../config';
import { callMethodAtEndpoint } from '../../meteor-helpers/method-endpoint';
import { limitQuery, applyPagination } from '../../utils/pagination-helpers';

exports.Query = {
  user: async (root, { _id, email }, { mongo: { Users } }) => {
    let query;
    if (_id) query = { _id };
    else if (email) query = { 'emails.address': email };
    return await Users.findOne(query);
  },
};

exports.Mutation = {
  login: async (root, { email, password }, { mongo: { Users } }) => {
    // Find user by email
    // TODO: Handle already logged in?
    const sentEmailRegex = new RegExp(`^${email}$`, 'i');
    const user = await Users.findOne({ 'emails.0.address': sentEmailRegex });
    if (user) {
      // Validate password
      let valid;
      try {
        const passwordString = SHA256(password);
        valid = await bcrypt.compare(passwordString, user.services.password.bcrypt);
      } catch (invalidPasswordErr) {
        throw new Error('Invalid email and password combination');
      }
      if (valid) {
        const token = jwt.sign({
          _id: user._id,
          email: user.emails[0].address,
        }, JWT_SECRET);
        user.jwt = token;
        return user;
      }
      throw new Error('Invalid email and password combination');
    }
    throw new Error('Email not found');
  },
  updateUserTimezone: async (root, { timezone }, { mongo: { Users }, user }) => {
    const methodArgs = {
      timezone,
    };
    await callMethodAtEndpoint('users.updateTimezone', { 'x-userid': user._id }, [methodArgs]);
    return await Users.findOne({ _id: user._id });
  },
  updateUserLastWorkspace: async (root, { workspace }, { mongo: { Users },
    user }) => {
    await callMethodAtEndpoint('updateUserLastWorkspace', { 'x-userid': user._id }, [workspace]);
    await callMethodAtEndpoint('users.updateWorkspaceTime', { 'x-userid': user._id }, [{ workspaceId: workspace }]);
    return await Users.findOne({ _id: user._id });
  },
  // 1. Always set to online when this method is called
  // 2. Set to away/offline when there aren't any other open connections
  updateUserOnlineStatus: async (root, { status }, { mongo: { Users, UsersSessions }, user }) => {
    if (status === 'online') {
      await Users.update({ _id: user._id }, { $set: { status, lastStatusChange: new Date() } });
    } else {
      const openSessions = await UsersSessions.findOne({ _id: user._id });
      if (!openSessions) {
        await Users.update({ _id: user._id }, { $set: { status, lastStatusChange: new Date() } });
      }
    }

    return await Users.findOne({ _id: user._id });
  },
};

exports.User = {
  email: ({ emails }) => {
    return emails[0].address;
  },
  firstName: ({ profile }) => {
    return profile.firstName || '';
  },
  lastName: ({ profile }) => {
    return profile.lastName || '';
  },
  username: ({ profile, emails }) => {
    const { firstName, lastName } = profile;
    const email = emails[0].address;
    return firstName && lastName ? `${firstName} ${lastName}` : email;
  },
  groups: async ({ _id }, { workspace, oneToOne, first, last, before, after, sortField = 'lastMessage', sortOrder = -1 }, { mongo: { Groups } }) => {
    const q = {
      workspace,
      members: _id,
      deleted: { $ne: true },
    };
    // add optional params
    if (oneToOne !== undefined) q.oneToOne = oneToOne;

    const cursor = await limitQuery(Groups, { sortField, sortOrder, before, after, q });
    const pageInfo = await applyPagination(cursor, first, last);
    const groups = await cursor.toArray();
    return {
      edges: groups.map(g => ({
        node: g,
        cursor: g._id,
      })),
      pageInfo,
    };
  },
  coworkers: async ({ _id }, { workspace }, { mongo: { Workspaces, Users } }) => {
    const query = { members: _id };
    if (workspace) {
      query._id = workspace;
    }
    const workspaces = await Workspaces.find(query).toArray();
    const members = workspaces.reduce((acc, curr) =>
      _.uniq(acc.concat(curr.members).concat(curr.externalMembers.map(m => m.userId))), []);
    return await Users.find({ _id: { $in: members } }).toArray();
  },
  lastWorkspace: ({ profile: { lastWorkspace } }) => lastWorkspace || '',
  settings: async (root, { workspace }, { mongo: { UserSettings } }) => {
    const userId = root._id;
    return await UserSettings.findOne({ userId, workspace });
  },
};
