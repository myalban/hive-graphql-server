import crypto from 'crypto';

const HEADER_REGEX = /Bearer meteor-(.*)$/;

// Super simple port of Accounts._hashLoginToken
// from Meteor: https://github.com/meteor/meteor/blob/master/packages/accounts-base/accounts_server.js
const hashLoginToken = (loginToken) => {
  const hash = crypto.createHash('sha256');
  hash.update(loginToken);
  return hash.digest('base64');
};

// Gets the user for context of a given request. Adapted from
// the apollographql/meteor-integration, see here:
// (https://github.com/apollographql/meteor-integration/blob/master/src/main-server.js)
// TODO: Do we want to port anything else from that integration to here?
export const getUserForContext = async (authorization, Users) => {
  if (typeof authorization !== 'string') throw new Error('Login token must be string!');

  const match = authorization && HEADER_REGEX.exec(authorization);
  const loginToken = match && match[1];
  if (!loginToken) {
    throw new Error('Invalid loginToken');
  }
  // The hashed token is the key to find the possible current user in the db
  const hashedToken = hashLoginToken(loginToken);
  // Get the possible current user from the database
  const currentUser = await Users.findOne({
    'services.resume.loginTokens.hashedToken': hashedToken,
  });

  // The current user exists
  if (currentUser) {
    // find the right login token corresponding, the current user may have
    // several sessions logged on different browsers / computers
    const tokenInformation = currentUser.services.resume.loginTokens.find(
      tokenInfo => tokenInfo.hashedToken === hashedToken
    );

    // get an exploitable token expiration date
    // TODO: Port Accounts._tokenExpiration over
    // const expiresAt = Accounts._tokenExpiration(tokenInformation.when);
    const expiresAt = new Date('9/1/2019');

    // Will be true if the token is expired.
    const isExpired = expiresAt < new Date();

    // If the token is still valid, give access to the current user
    // information in the resolvers context.
    if (!isExpired) {
      // return a new context object with the current user & her id
      return currentUser;
    }
  }
};
