import jwt from 'jsonwebtoken';
import { getUserForContext } from 'hive-graphql-auth';
import { JWT_SECRET } from '../config';

const METEOR_TOKEN_REGEX = /Bearer meteor-(.*)$/;
const JWT_REGEX = /Bearer (.*)$/;

// Checks for both Meteor Tokens and JWTs.
// Meteor Tokens take the header format:
// 'Authorization': 'Bearer meteor-TOKEN_HERE'
// JWT take standard format:
// 'Authorization': 'Bearer TOKEN_HERE'
//
// This function tries to determine which is
// passed and returns the user context accordingly.
// Takes Authorization header value
// Returns user { _id, emails: [{ address: 'name@site.com' }] }
const checkAuth = async (authHeader, Users) => {
  let user;
  if (typeof authHeader !== 'string') throw new Error('Token must be string!');

  const match = authHeader && METEOR_TOKEN_REGEX.exec(authHeader);
  const meteorToken = match && match[1];
  // Use Meteor token if 
  if (meteorToken) {
    user = await getUserForContext({ authorization: authHeader }, Users);
  } else {
    // TODO: Add expiration
    // TODO: Add proper error handling - do we require auth on all requests?
    const jwtMatch = authHeader && JWT_REGEX.exec(authHeader);
    const token = jwtMatch && jwtMatch[1];
    const decoded = jwt.verify(token, JWT_SECRET, { complete: true }) || {};
    const { _id, email } = decoded;
    user = { _id, emails: [{ address: email }] };
  }
  return user;
};

export default checkAuth;
