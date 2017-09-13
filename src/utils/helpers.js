export async function globalRank(Actions, workspace, aboveActionId = '', belowActionId = '', existingActionId = false, sortingBy) {
  // Determine global rank based on workspace, above action, below action and moving action
  // Get above item
  let existingAction = null;
  let aboveAction = null;
  let belowAction = null;

  if (existingActionId) {
    // Get existing action
    existingAction = Actions.findOne(existingActionId);
  }

  // We check if above action has no deadline, to prevent rank calculation issues
  // When action with small rank moved at the top (because it has deadline)
  // and calculations is uncorrect :(
  const selector = sortingBy === 'deadline' && existingAction && !existingAction.deadline ? { deadline: null } : {};

  if (aboveActionId) {
    // Get above action
    aboveAction = Actions.findOne({ _id: aboveActionId, ...selector });
  }
  if (belowActionId) {
    // Get below action
    belowAction = Actions.findOne({ _id: belowActionId, ...selector });
  }

  // Get lowest ranked action in workspace
  let lowestRankedAction = await Actions.find({ workspace, deleted: { $ne: true } },
    { sort: { rank: 1 }, limit: 1 }).toArray();

  lowestRankedAction = lowestRankedAction[0];
  let nextHighestRankedAction;
  let nextLowestRankedAction;

  if (aboveAction) {
    // Find next item's rank
    nextHighestRankedAction = belowAction
      || await Actions.find({ workspace,
        deleted: { $ne: true },
        rank: { $gt: aboveAction.rank } }, { sort: { rank: 1 }, limit: 1 }).toArray();

    nextHighestRankedAction = nextHighestRankedAction[0];
    if (nextHighestRankedAction) {
      // Determine new rank
      return (aboveAction.rank + nextHighestRankedAction.rank) / 2;
    }
    // Otherwise new rank is going to be highest plus 1
    return aboveAction.rank + 1;
  } else if (belowAction) {
    // Find item with rank directly lower than below action's rank
    nextLowestRankedAction = await Actions.find({ workspace,
      deleted: { $ne: true },
      rank: { $lt: belowAction.rank } }, { sort: { rank: -1 }, limit: 1 }).toArray();

    nextLowestRankedAction = nextLowestRankedAction[0];
    if (nextLowestRankedAction) {
      // Determine new rank
      return (belowAction.rank + nextLowestRankedAction.rank) / 2;
    }
    // Otherwise new rank is going to be highest minus 1
    return belowAction.rank - 1;
  } else if (existingAction) {
    // Return existing rank with small amount added. I know, ugly but necessary
    // To avoid sortable ui add/remove issues.
    return existingAction.rank;
  }

  if (lowestRankedAction) {
    // Otherwise get lowest ranked action in workspace - 1
    return lowestRankedAction.rank - 1;
  }

  // Nothing lol
  return 1;
}

export function transformStringAttrsToDates(action) {
  const dateAttributes = ['deadline', 'createdAt', 'modifiedAt', 'checkedDate', 'scheduledDate'];

  dateAttributes.forEach((attr) => {
    action[attr] = action[attr] && new Date(action[attr]);
  });

  return action;
}
