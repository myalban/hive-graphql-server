// import path from 'path';
// import { fileLoader, mergeTypes } from 'merge-graphql-schemas';

// const typesArray = fileLoader(path.join(__dirname, './types'));

// export default mergeTypes(typesArray);

import { mergeTypes } from 'merge-graphql-schemas';
import actionType from './types/actionType';
import groupType from './types/groupType';
import messageType from './types/messageType';
import userType from './types/userType';

const types = [
  actionType,
  groupType,
  messageType,
  userType,
];

export default mergeTypes(types);
