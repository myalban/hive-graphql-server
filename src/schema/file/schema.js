let Base;
let File;

module.exports = () => [File, Base];

Base = require('../base');

File = `
  enum FileStore {
    GOOGLE
    DROPBOX
    HIVE
    BOX
  }

  type File {
    _id: ID!
    url: String!
    thumbnail: String
    fileStore: FileStore!
    type: String # file or directory
  }
`;
