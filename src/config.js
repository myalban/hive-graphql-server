import dotenv from 'dotenv';

dotenv.config({ silent: true });

export const {
  JWT_SECRET,
  LOCAL_METEOR_TOKEN,
  LOCAL_JWT,
} = process.env;

const defaults = {
  JWT_SECRET: 'some_secret_this_is',
  LOCAL_METEOR_TOKEN: 'ABC.123',
  LOCAL_JWT: 'XYZ.987',
};

Object.keys(defaults).forEach((key) => {
  if (!process.env[key] || process.env[key] === defaults[key]) {
    throw new Error(`Please enter a custom ${key} in your .env file on the root directory`);
  }
});

export default JWT_SECRET;
