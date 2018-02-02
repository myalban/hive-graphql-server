import dotenv from 'dotenv';

dotenv.config({ silent: true });

export const {
  JWT_SECRET,
  METEOR_URL,
  GRAPHQL_URL,
  MONGO_URL
} = process.env;

const defaults = {
  JWT_SECRET: 'some_secret_this_is',
  METEOR_URL: 'meteor.hive.com',
  GRAPHQL_URL: 'graphql.hive.com',
  MONGO_URL: 'mongodb://mongo.hive.com:3001',
  REDIS_URL: 'redis.hive.com',
  REDIS_PORT: 1234,
  REDIS_PASSWORD: 'secret_redis_password_here',
};

Object.keys(defaults).forEach((key) => {
  if (!process.env[key] || process.env[key] === defaults[key]) {
    throw new Error(`Please enter a custom ${key} in your .env file on the root directory`);
  }
});

export default JWT_SECRET;
