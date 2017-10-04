import _ from 'lodash';

function getUserShareClause(userId) {
  return [
    { sharingType: 'me', userId },
    { sharingType: 'custom', members: userId },
    { sharingType: 'everyone' },
  ];
}

function userHasAccess(userId, project) {
  let access = false;
  switch (project.sharingType) {
    case 'me':
      access = userId === project.userId;
      break;
    case 'custom':
      access = project.members.indexOf(userId) > -1;
      break;
    case 'everyone':
      access = true;
      break;
    default:
      throw new Error('bad-share-type', `Project sharingType ${project.sharingType} not valid`);
  }
  return access;
}

function getUserViewType(userId, actionView, userSettings) {
  if (userSettings) {
    const layout = _.find(userSettings.actionViewLayout, { id: actionView._id });
    if (layout) {
      return layout.type;
    }
  }

  return actionView.viewType;
}

function getUserListTitle(userId, actionView, userSettings) {
  if (userSettings) {
    const layout = _.find(userSettings.actionViewLayout, { id: actionView._id });
    if (layout) {
      return layout.listTitle;
    }
  }

  return actionView.listTitle;
}

function getPrivacyClause(userId) {
  return [
    { privacy: 'public' },
    { privacy: 'private', assignees: userId },
  ];
}

function ignoreCompletedFilterStatus(userId, actionView, viewType) {
  const statuses = ['listView', 'calendar'];
  return statuses.indexOf(viewType) > -1;
}


export async function myActions(
  { workspace, limit = null, skip = 0, filters = {} },
  { mongo: { Actions }, user }) {
  const isCompleted = filters.actionType === 'completed';

  const query = {
    workspace,
    assignees: user._id,
    deleted: false,
    archived: false,
    isRecurringVisible: { $ne: false },
    checked: false,
  };

  const options = { sort: { rank: 1 } };
  if (filters.sortType === 'deadline') {
    options.sort = { deadline: -1, rank: 1 };
  }

  if (isCompleted) {
    query.checked = true;
    query.checkedDate = { $ne: null };
    options.sort = { checkedDate: -1, rank: 1 };
  }

  if (limit) {
    options.limit = limit;
    options.skip = skip;
  }

  const cursor = Actions.find(query, options);
  return {
    actions: cursor.toArray(),
    count: isCompleted ? cursor.count() : null,
  };
}


export async function kanbanActions(
  { name, viewId, workspace, limit = null, skip = 0, filters = {} },
  { mongo: { Actions, ActionViews, Projects, UserSettings }, user }) {
  const actionView = await ActionViews.findOne({ _id: viewId, deleted: false });
  if (!actionView) throw new Error(`actionView not found ${viewId}`);
  const columnId = name;
  const userId = user._id;
  let { labels, assignees, sortType } = actionView;
  const { projectId, projects = [] } = actionView;

  const userSettings = await UserSettings.findOne({
    userId,
    workspace: actionView.workspace,
    'actionViewLayout.id': actionView._id,
  }, { fields: { actionViewLayout: 1 } });

  const viewType = getUserViewType(userId, actionView, userSettings);
  const listTitle = getUserListTitle(userId, actionView, userSettings);

  let statuses = [];
  let createdBy = [];
  if (filters.sortType) sortType = filters.sortType;
  if (filters.assignees && filters.assignees.length) assignees = filters.assignees;
  if (filters.statuses && filters.statuses.length) statuses = filters.statuses;
  if (filters.labels && filters.labels.length) labels = filters.labels;
  if (filters.createdBy && filters.createdBy.length) createdBy = filters.createdBy;

  let sort = { rank: 1 };
  if (sortType === 'deadline') {
    sort = { deadline: -1, rank: 1 };
  } else if (sortType === 'checkedDate') {
    sort = { checkedDate: -1, rank: 1 };
  }

  const query = {
    workspace,
    deleted: false,
    // recurring actions
    $and: [{
      $or: [
        { isRecurringVisible: true },
        { recurringId: null },
      ],
    }, {
      // Private and assigned to
      // this user or public.
      $or: getPrivacyClause(userId),
    }],
  };

  if (!filters.archived) {
    query.archived = false;
  }

  // Be sure to query based on project (if project view)
  if (projectId) {
    // Make sure user can access project if present.
    // Only re-run if sharing permissions, deleted or archived changes.
    const project = await Projects.findOne({ _id: projectId }, {
      fields: { members: 1, userId: 1, sharingType: 1, deleted: 1, archived: 1 },
    });
    if (!project) {
      throw new Error('project-not-found', `Project ${projectId} not found`);
    } else if (!userHasAccess(userId, project)) {
      throw new Error('no-access', `User has no access to project ${projectId}`);
    }
    query.$and.push({ projectId });
  } else {
    // Advanced view; show actions either with null projectId
    // or a project id belonging to a user-accessible project.
    let accessibleProjects = await Projects.find({
      workspace,
      $or: getUserShareClause(userId),
      deleted: false,
      archived: false,
    }, { fields: { _id: 1 } }).toArray();

    accessibleProjects = accessibleProjects && accessibleProjects.map(a => a._id);
    let showNoProject = false;
    // If AV has projects - show them
    if (projects && projects.length) {
      accessibleProjects = _.intersection(projects, accessibleProjects);
      if (projects.indexOf(null) !== -1) showNoProject = true;
    } else {
      showNoProject = true;
    }

    // Apply filters
    if (filters.projects && filters.projects.length) {
      accessibleProjects = _.intersection(filters.projects, accessibleProjects);
      if (filters.projects.indexOf(null) === -1) {
        showNoProject = false;
      }
    }

    if (showNoProject) accessibleProjects.unshift(null);
    query.$and.push({ projectId: { $in: accessibleProjects } });
  }

  const filterQuery = {};
  const parentQuery = { $and: [{ parent: null }, {}] };
  const subactionsQuery = { $and: [] };
  let ancestorQuery = {};
  let subactions = {};

  if (statuses && statuses.length) {
    query.status = { $in: statuses };
  }

  if (assignees && assignees.length) {
    query.assignees = { $in: assignees };
  }

  if (createdBy.length) {
    query.createdBy = { $in: createdBy };
  }

  if (labels && labels.length) {
    query.labels = { $in: labels };
  }

  const options = {
    limit,
    sort,
  };

  // viewTypes that should ignore completed status in dropdown filter
  if (ignoreCompletedFilterStatus(userId, actionView, viewType)) {
    // ignore completed if filter isn't set
    if (!filters.completed) {
      query.checked = false;
    } else {
      statuses.push('Completed');
    }
  }

  switch (viewType) {
    case 'listView':
      if (listTitle === 'assignees') {
        parentQuery.$and[1].assignees = columnId;

        ancestorQuery = { $or: [
          { 'ancestorAttributes.assignees': { $ne: columnId } },
        ] };
        subactions = { $and: [
          { assignees: columnId },
        ] };

        // apply filters to subactions
        if (labels.length) {
          ancestorQuery.$or.push({ 'ancestorAttributes.labels': { $nin: labels } });
          subactions.$and.push({ labels: { $in: labels } });
        }

        // apply filters to subactions when status selected in filters
        if (statuses.length) {
          ancestorQuery.$or.push({ 'ancestorAttributes.status': { $nin: statuses } });
          subactions.$and.push({ status: { $in: statuses } });
        }
      } else if (listTitle === 'labels') {
        parentQuery.$and[1].labels = columnId;

        ancestorQuery = { $or: [
          { 'ancestorAttributes.labels': { $ne: columnId } },
        ] };
        subactions = { $and: [
          { labels: columnId },
        ] };

        // apply filters to subactions when assignee selected in filters
        if (assignees.length) {
          ancestorQuery.$or.push({ 'ancestorAttributes.assignees': { $nin: assignees } });
          subactions.$and.push({ assignees: { $in: assignees } });
        }

        // apply filters to subactions when status selected in filters
        if (statuses.length) {
          ancestorQuery.$or.push({ 'ancestorAttributes.status': { $nin: statuses } });
          subactions.$and.push({ status: { $in: statuses } });
        }
      }
      break;
    case 'progress':
      parentQuery.$and[1].status = columnId;
      // apply filters to subactions
      if (labels.length || assignees.length) {
        ancestorQuery = { $or: [
          { 'ancestorAttributes.status': { $ne: columnId } },
        ] };

        subactions = { $and: [
          { status: columnId },
        ] };

        if (labels.length) {
          ancestorQuery.$or.push({ 'ancestorAttributes.labels': { $nin: labels } });
          subactions.$and.push({ labels: { $in: labels } });
        }

        if (assignees.length) {
          ancestorQuery.$or.push({ 'ancestorAttributes.assignees': { $nin: assignees } });
          subactions.$and.push({ assignees: { $in: assignees } });
        }
      } else {
        ancestorQuery['ancestorAttributes.status'] = { $ne: columnId };
        subactions.status = columnId;
      }

      query.checked = columnId === 'Completed' ? true : { $ne: true };
      break;
    default: return {};
  }

  subactionsQuery.$and.push(ancestorQuery, subactions);
  filterQuery.$or = [parentQuery, subactionsQuery];
  query.$and.push(filterQuery);

  options.skip = skip;
  const cursor = Actions.find(query, options);
  // console.log(JSON.stringify(query));
  return {
    actions: cursor.toArray(),
    count: cursor.count(),
  };
}
