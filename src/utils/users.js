

export const getDisplayNamesForUsers = (thisUsers, allWorkspaceUsers) => {
  const duplicateFirstNameHash = {};

  allWorkspaceUsers.forEach((u) => {
    const firstName = u.profile.firstName;
    if (!duplicateFirstNameHash[firstName]) {
      duplicateFirstNameHash[firstName] = 1;
    } else {
      duplicateFirstNameHash[firstName] += 1;
    }
  });

  return thisUsers.map((u) => {
    const name = u.profile.firstName || (u.emails.length && u.emails[0].address) || '';
    if (duplicateFirstNameHash[name] > 1) {
      return `${name} ${u.profile.lastName}`;
    }

    return name;
  });
};
