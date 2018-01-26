exports.UserSettings = {
  hiddenGroups: async ({ hiddenGroups }, data, { mongo: { Groups } }) => {
    const groups = await Groups.find({ _id: { $in: hiddenGroups } }).toArray();
    return groups;
  },
};
