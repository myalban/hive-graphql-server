import { MongoClient } from 'mongodb';

// const MONGO_URL = 'mongodb://localhost:27017/hackernews';
const MONGO_URL = 'mongodb://localhost:3001/meteor';

module.exports = async () => {
  const db = await MongoClient.connect(MONGO_URL);
  return {
    Links: db.collection('hnLinks'),
    Users: db.collection('users'),
    Votes: db.collection('votes'),
  };
};
