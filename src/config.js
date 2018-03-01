import dotenv from 'dotenv';
import path from 'path';
import environment from './utils/environment-helpers';

const envPath = environment.isDev() ?
  path.resolve(process.cwd(), '.env.local') :
  path.resolve(process.cwd(), `.env.${environment.getEnv()}`);

dotenv.config({ silent: true, path: envPath });

export const {
  JWT_SECRET,
  METEOR_URL,
  GRAPHQL_URL,
  LOCAL_METEOR_USER,
  MONGO_URL,
  REDIS_URL,
  REDIS_PORT,
  REDIS_PASSWORD,
  PAPERTRAIL_HOST,
  PAPERTRAIL_PORT,
} = process.env;

const defaults = {
  JWT_SECRET: 'some_secret_this_is',
  METEOR_URL: 'meteor.hive.com',
  GRAPHQL_URL: 'graphql.hive.com',
  LOCAL_METEOR_USER: 'test@mail.com',
  MONGO_URL: 'mongodb://mongo.hive.com:3001',
  REDIS_URL: 'redis.hive.com',
  REDIS_PORT: 1234,
  REDIS_PASSWORD: 'secret_redis_password_here',
  PAPERTRAIL_HOST: 'logs.papertrailapp.com',
  PAPERTRAIL_PORT: 55555,
};

Object.keys(defaults).forEach((key) => {
  if (!process.env[key] || process.env[key] === defaults[key]) {
    throw new Error(`Please enter a custom ${key} in your .env file on the root directory`);
  }
});

export default JWT_SECRET;
