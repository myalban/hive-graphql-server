let Base;
let User;
let ActivityFeed;

module.exports = () => [ActivityFeed, User, Base];

Base = require('../base');
User = require('../user/schema');

ActivityFeed = `
  extend type Query {
    # Returns activity feeds
    activityFeeds(isRead: Boolean, first: Int, after: String, last: Int, before: String, sortField: String, sortOrder: Int): ActivityFeedConnection
  }

  extend type Mutation {
    updateFeedAllRead: Boolean # Mark all activity feeds as read
    updateFeedRead(attachedItemId: String!, isRead: Boolean!): Boolean # Mark activity all feeds with attachedItemId as read or unread
    updateMessagesFeedRead(groupId: String!): Boolean # Mark all activity feeds related to groupId as read
  }

  type ActivityFeed {
    _id: ID! # unique id for the group
    actorId: User # the user that created this notification (Activity feed)
    workspace: String!
    isRead: Boolean! # whether or not this activity feed has been marked as read
    type: String! # type of the activity feed
    assignedTo: String! # User that this activity feed assigned to
    title: String # Title of the activity feed
    body: String! # Body of the activity feed
    attachedItemType: String! # Indicates the source of the activity feed (e.g. message, actions, project)
    attachedItemId: String! # ID of the source of the activity feed (e.g. if attachedItemType is message then attachedItemId will be the messageId)
    projectName: String # name of the project if the source of the activity feed is project
    containerId: String # In case attachedItemType is message containerId will be set to groupId of the message
    deleted: Boolean! # whether or not this message has been deleted
    modifiedAt: String
    createdBy: String
    createdAt: String
    modifiedBy: String
  }

  type ActivityFeedConnection {
    edges: [ActivityFeedEdge]
    pageInfo: PageInfo!
  }

  type ActivityFeedEdge {
    cursor: String! # ActivityFeed id
    node: ActivityFeed! # ActivityFeed object
  }
`;
