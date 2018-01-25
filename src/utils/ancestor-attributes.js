import { Actions } from '../mongo-connector';

// TODO: Could maybe refactor to be DRY
// These helpers reduce the amount of updates
// that happen when syncing an action's ancestor
// attribute. They allow us to be explicit about
// which field [status, labels, assignees, title]
// in ancestor attribute needs to sync instead
// of naively syncing all fields on all updates.
// They're also quick in that when updating down
// a family tree, they don't need to run recursively
// (something we used to do).
export default {
  updateStatusByQuery(query, status, useRoot = true) {
    Actions.find(query, { fields: { _id: 1, root: 1 } }).toArray((err, actions) => {
      if (actions.length) {
        const ids = actions.map(a => a._id);
        // we are trying to find the top action id of the tree (root)
        // all children and grandchildren have root attribute
        const selector = { ancestorAttributes: { $elemMatch: { id: { $in: ids } } } };
        if (useRoot) {
          selector.root = actions[0].root || actions[0]._id;
        }
        Actions.update(selector,
          { $set: { 'ancestorAttributes.$.status': status } }, { multi: true });
      }
    });
  },
  updateTitleById(action, title) {
    const id = action._id;
    // try to get action root id
    const root = action && (action.root || (action.hasSubactions && action._id));

    if (root) {
      Actions.update({ root,
        ancestorAttributes: { $elemMatch: { id } } }, { $set: { 'ancestorAttributes.$.title': title } }, { multi: true });
    }
  },
};
