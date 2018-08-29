import { MongoClient } from 'mongodb';

export default async (userId, medium) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  const { DB_NAME } = process.env;
  const db = client.db(DB_NAME);
  const mediumId = medium._id;

  try {
    if (medium.subscriptionIds) {
      const { isLocked } = medium;
      return { isLocked: isLocked || false, state: isLocked ? 'locked' : 'subscribed' };
    }

    const [deadline, views, unlocks, purchases] = await Promise.all([
      db.collection('deadlines').findOne({ content_ID: mediumId, userId }),
      db.collection('views').findOne({ userID: userId, content_ID: mediumId }),
      db.collection('unlocks').count({ userId, content_ID: mediumId, date: { $gte: new Date() } }),
      db.collection('purchases').count({ 'purchase.userId': userId, 'purchase.audios._id': mediumId }),
    ]);


    if (unlocks > 0) {
      return { isLocked: false, state: 'unlocked' };
    }

    if (purchases > 0) {
      return { isLocked: false, state: 'purchased' };
    }

    const { numviews } = views || { numviews: 0 };
    if (!medium) throw new Error('Medium not found');
    let remaingViews;
    const { distribution } = medium;

    switch (distribution) {
      case 'freeStream': {
        return { isLocked: false, state: 'freeStream' };
      }
      case '1free': {
        remaingViews = 1 - numviews;
        return {
          isLocked: (remaingViews <= 0),
          state: (remaingViews <= 0) ? 'locked' : `${remaingViews}free`,
        };
      }
      case '2free': {
        remaingViews = 2 - numviews;
        return {
          isLocked: (remaingViews <= 0),
          state: (remaingViews <= 0) ? 'locked' : `${remaingViews}free`,
        };
      }
      case '3free': {
        remaingViews = 3 - numviews;
        return {
          isLocked: (remaingViews <= 0),
          state: (remaingViews <= 0) ? 'locked' : `${remaingViews}free`,
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

        return {
          isLocked: !!lastView,
          state: `${lastView}free`,
        };
      }
      default:
        throw new Error('Invalid medium distribution');
    }
  } finally {
    client.close();
  }
};
