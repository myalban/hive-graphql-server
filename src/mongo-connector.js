import { MongoClient } from 'mongodb';

const MONGO_URL = 'mongodb://localhost:27017/hackernews';
const METEOR_MONGO_URL = 'mongodb://localhost:3001/meteor';

module.exports = async () => {
  const db = await MongoClient.connect(MONGO_URL);
  const meteorDb = await MongoClient.connect(METEOR_MONGO_URL);
  return {
    Links: db.collection('links'),
    // Use Meteor DB for users (for now).
    Users: meteorDb.collection('users'),
    Votes: db.collection('votes'),
  };
};
