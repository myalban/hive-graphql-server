/* eslint-disable prefer-arrow-callback */
import DataLoader from 'dataloader';

async function batchUsers(Users, keys) {
  const users = await Users.find({ _id: { $in: keys } }).toArray();
  // Sort users array to match keys provided. This is unfortunate,
  // but data loader only works if the keys array matches the returned
  // values in exact sort order. Otherwise silently fails and mismatches.
  // See constaints: https://github.com/facebook/dataloader#batch-function
  // E.g. keys [1, 2, 3] would fail if users returned [{_id: 1}, {_id: 3}, {_id: 2}]
  // Issue to throw error/warning is opened here: https://github.com/facebook/dataloader/issues/104
  return users.sort(function sortUsers(a, b) {
    return keys.indexOf(a._id) - keys.indexOf(b._id);
  });
}

module.exports = ({ Users }) => ({
  userLoader: new DataLoader(
    keys => batchUsers(Users, keys),
    { cacheKeyFn: key => key.toString() },
  ),
});
