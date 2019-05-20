import { MongoClient } from 'mongodb';

export default async (userId, appId, medium) => {
  if (!userId) {
    return {
      isLocked: true,
      state: 'locked',
    };
  }
  const client = await MongoClient.connect(process.env.MONGO_URL);
  const { DB_NAME } = process.env;
  const db = client.db(DB_NAME);
  const mediumId = medium._id;

  try {
    if (medium.subscriptionIds) {
      const { isLocked } = medium;
      return { isLocked: isLocked || false, state: isLocked ? 'locked' : 'subscribed' };
    }
    const lastday = new Date();
    lastday.setDate(new Date().getDate() - 1);
    const [deadline, views, unlocks, purchases] = await Promise.all([
      db.collection('deadlines').findOne({
        content_ID: mediumId,
        userId,
        appIds: { $elemMatch: { $eq: appId } },
      }),
      db.collection('views').findOne({
        userID: userId,
        content_ID: mediumId,
        appIds: { $elemMatch: { $eq: appId } },
      }),
      db.collection('unlocks').count({
        userId,
        content_ID: mediumId,
        date: { $gte: lastday },
        appIds: { $elemMatch: { $eq: appId } },
      }),
      db.collection('purchases').count({
        'purchase.userId': userId,
        'purchase.audios._id': mediumId,
        appIds: { $elemMatch: { $eq: appId } },
      }),
    ]);

    if (unlocks > 0) {
      return { isLocked: false, state: 'unlocked' };
    }

    if (purchases > 0) {
      return { isLocked: false, state: 'purchased' };
    }

    const { numviews } = views || { numviews: 0 };
    if (!medium) throw new Error('Medium not found');
    let remainingViews;
    const { distribution } = medium;
    switch (distribution) {
      case 'freeStream': {
        return { isLocked: false, state: 'freeStream' };
      }
      case '1free': {
        remainingViews = 1 - numviews;
        return {
          isLocked: (remainingViews <= 0),
          state: (remainingViews <= 0) ? 'locked' : `${remainingViews}free`,
        };
      }
      case '2free': {
        remainingViews = 2 - numviews;
        return {
          isLocked: (remainingViews <= 0),
          state: (remainingViews <= 0) ? 'locked' : `${remainingViews}free`,
        };
      }
      case '3free': {
        remainingViews = 3 - numviews;
        return {
          isLocked: (remainingViews <= 0),
          state: (remainingViews <= 0) ? 'locked' : `${remainingViews}free`,
        };
      }
      case '1freePerDay':
      case '2freePerDay':
      case '3freePerDay': {
        if (!deadline) {
          return {
            isLocked: false,
            state: distribution,
          };
        }
        const { deadlineDate, lastView } = deadline;
        if (new Date() > deadlineDate) {
          return {
            isLocked: false,
            state: distribution,
          };
        }
        const isLocked = (lastView <= 0);
        return {
          isLocked,
          state: isLocked ? 'locked' : `${lastView}freePerDay`,
        };
      }
      default:
        throw new Error('Invalid medium distribution');
    }
  } finally {
    client.close();
  }
};
