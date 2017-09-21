class PermissionError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

export async function assertUserPermission(workspaceId, userId, Workspaces) {
  const wk = await Workspaces.findOne({ _id: workspaceId, members: userId });
  if (!wk) {
    throw new PermissionError(`User ${userId} does not have permission to access ${workspaceId} `, 'workspace permission');
  }
}
