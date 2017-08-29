import { MongoClient, Logger } from 'mongodb';

const MONGO_URL = 'mongodb://localhost:27017/hackernews';
const METEOR_MONGO_URL = 'mongodb://localhost:3001/meteor';

module.exports = async () => {
  const db = await MongoClient.connect(MONGO_URL);
  const meteorDb = await MongoClient.connect(METEOR_MONGO_URL);

  // Allows us to log total requests. Useful
  // for making sure queries use data loaders.
  if (process.env.LOG_MONGO) {
    let logCount = 0;
    Logger.setCurrentLogger((msg, state) => {
      console.log(`MONGO DB REQUEST ${++logCount}`);
      console.log(msg);
    });
    Logger.setLevel('debug');
    Logger.filter('class', ['Cursor']);
  }

  return {
    Links: db.collection('links'),
    Votes: db.collection('votes'),
    // Use Meteor DB for some collections (eventually all)
    Actions: meteorDb.collection('actions'),
    ActionViews: meteorDb.collection('actionViews'),
    Workspaces: meteorDb.collection('workspaces'),
    Users: meteorDb.collection('users'),
  };
};
