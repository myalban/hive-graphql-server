

export const getDisplayNamesForUsers = (members, allWorkspaceUsers) => {
  const duplicateFirstNames = {};
  const userNamesMap = {};

  allWorkspaceUsers.forEach((u) => {
    const firstName = u.profile.firstName;
    if (!duplicateFirstNames[firstName]) {
      duplicateFirstNames[firstName] = 1;
    } else {
      duplicateFirstNames[firstName] += 1;
    }

    userNamesMap[u._id] = {
      firstName: u.profile.firstName || (u.emails.length && u.emails[0].address) || '',
      fullName: `${u.profile.firstName} ${u.profile.lastName}`,
    };
  });

  return members.map((id) => {
    const user = userNamesMap[id];
    if (duplicateFirstNames[user.firstName] > 1) {
      return userNamesMap[id].fullName;
    }
    return user.firstName;
  });
};
