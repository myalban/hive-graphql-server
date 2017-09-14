/* eslint-disable import/no-mutable-exports */
import { MongoClient, Logger } from 'mongodb';

const METEOR_MONGO_URL = 'mongodb://localhost:3001/meteor';
export let Actions = {};

export default async function () {
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

  Actions = meteorDb.collection('actions');
  const collections = {
    Actions,
    ActionViews: meteorDb.collection('actionViews'),
    Workspaces: meteorDb.collection('workspaces'),
    Users: meteorDb.collection('users'),
  };

  return collections;
}
