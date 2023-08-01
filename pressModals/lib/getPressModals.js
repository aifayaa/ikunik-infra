import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_PRESS_MODALS,
  COLL_USERS,
} = mongoCollections;

const publicFields = [
  '_id',
  'articleId',
  'html',
  'maxDisplayCount',
  'title',
  'type',
  'video',
  'zindex',
];

function countBadgesPerStatus(badges) {
  const counts = badges.reduce((acc, badge) => {
    const { status = 'validated' } = badge;
    acc[status] = (acc[status] || 0) + 1;
    return (acc);
  }, {});

  return (counts);
}

function haveBadges(user) {
  if (!user) return (false);
  if (!user.badges) return (false);
  if (user.badges.length === 0) return (false);

  const counts = countBadgesPerStatus(user.badges);
  if (counts.validated > 0) return (true);

  return (false);
}

function havePendingBadges(user) {
  if (!user) return (false);
  if (!user.badges) return (false);
  if (user.badges.length === 0) return (false);

  const counts = countBadgesPerStatus(user.badges);
  if (counts.requested > 0) return (true);

  return (false);
}

export default async function getBanners(appId, {
  type = null,
  articleId = null,
}, { userId }) {
  const client = await MongoClient.connect();

  try {
    const query = { appId };

    if (type !== null) {
      query.type = type;
    }
    if (articleId !== null) {
      query.articleId = articleId;
    }

    const dbModals = await client
      .db()
      .collection(COLL_PRESS_MODALS)
      .find(query)
      .toArray();

    const dbUser = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId, appId });

    const modals = dbModals.filter((modal) => {
      if (typeof modal.loggedIn === 'boolean') {
        if ((!modal.loggedIn) !== (!userId)) {
          return (false);
        }
      }

      if (modal.badges) {
        if (typeof modal.badges.none === 'boolean') {
          if (!haveBadges(dbUser) !== modal.badges.none) {
            return (false);
          }
        }
        if (typeof modal.badges.pending === 'boolean') {
          if (havePendingBadges(dbUser) !== modal.badges.pending) {
            return (false);
          }
        }
      }

      return (true);
    }).map((modal) => (
      publicFields.reduce((acc, field) => {
        if (modal[field] !== undefined) {
          acc[field] = modal[field];
        }
        return (acc);
      }, {})
    ));

    return (modals);
  } finally {
    client.close();
  }
}
