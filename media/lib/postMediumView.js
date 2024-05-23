/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_AUDIOS,
  COLL_CONTENT_BY_USER_METRIC,
  COLL_DEADLINES,
  COLL_METRICS,
  COLL_PROJECTS,
  COLL_VIDEOS,
  COLL_VIEWS,
} = mongoCollections;

// To avoid getting a warning with lint
const jsConsole = console;

export default async (userId, appId, mediumType, mediumId) => {
  const client = await MongoClient.connect();
  try {
    let medium;
    let mediaCol;
    const modifier = {
      $inc: { views: 1 },
      $set: {
        appId,
        lastView: new Date(),
      },
    };
    const query = {
      _id: mediumId,
      appId,
    };

    switch (mediumType) {
      case 'audio':
        mediaCol = COLL_AUDIOS;
        ({ value: medium } = await client
          .db()
          .collection(mediaCol)
          .findOneAndUpdate(query, modifier));
        break;
      case 'video':
        mediaCol = COLL_VIDEOS;
        ({ value: medium } = await client
          .db()
          .collection(mediaCol)
          .findOneAndUpdate(query, modifier));
        break;
      case 'all':
        mediaCol = COLL_AUDIOS;
        ({ value: medium } = await client
          .db()
          .collection(mediaCol)
          .findOneAndUpdate(query, modifier));
        if (!medium) {
          mediaCol = COLL_VIDEOS;
          ({ value: medium } = await client
            .db()
            .collection(mediaCol)
            .findOneAndUpdate(query, modifier));
        }
        break;
      default:
        throw new Error('wrong type');
    }

    if (!medium) throw new Error('medium not found');
    const { distribution } = medium;

    // Deadline should be update only if it's freePerDay distros
    if (distribution && distribution.includes('PerDay')) {
      const deadlines = await client.db().collection(COLL_DEADLINES).findOne({
        userId,
        content_ID: mediumId,
        appId,
      });
      const { deadlineDate } = deadlines || {};

      if ((deadlines && new Date() > deadlineDate) || !deadlines) {
        // Deadline expired or no deadline, new one
        jsConsole.info(
          'create a new deadline because',
          `NoDeadline: ${!deadlines}`,
          `expired:${new Date() > deadlineDate}`
        );
        const newDate = new Date();
        newDate.setDate(new Date().getDate() + 1);
        let maxViews;
        switch (distribution) {
          case '1freePerDay':
            maxViews = 1;
            break;
          case '2freePerDay':
            maxViews = 2;
            break;
          case '3freePerDay':
            maxViews = 3;
            break;
          default:
            throw new Error('wrong distribution');
        }
        const newLastView = maxViews - 1;
        await client
          .db()
          .collection(COLL_DEADLINES)
          .updateOne(
            {
              userId,
              content_ID: mediumId,
              appId,
            },
            {
              $set: {
                deadlineDate: newDate,
                lastView: newLastView,
                appId,
              },
            },
            {
              upsert: true,
            }
          );
      } else {
        jsConsole.info('update an existing deadline');
        // Simple update the deadline to decrement
        await client
          .db()
          .collection(COLL_DEADLINES)
          .updateOne(
            {
              userId,
              content_ID: mediumId,
              appId,
            },
            {
              $inc: {
                lastView: -1,
              },
              $set: {
                appId,
              },
            },
            {
              upsert: true,
            }
          );
      }
    }

    await client
      .db()
      .collection(COLL_PROJECTS)
      .updateOne(
        {
          _id: medium.project_ID,
          appId,
        },
        {
          $inc: { views: 1 },
          $set: { lastView: new Date() },
        }
      );
    await client
      .db()
      .collection(COLL_CONTENT_BY_USER_METRIC)
      .updateOne(
        {
          user_ID: userId,
          content_ID: mediumId,
          appId,
        },
        {
          $inc: { views: 1 },
          $set: {
            date: new Date(),
            appId,
            collection: mediaCol,
          },
        },
        { upsert: true }
      );

    // update the total number for Crowdaa
    // Historic code
    await client
      .db()
      .collection(COLL_METRICS)
      .updateOne(
        { appId },
        {
          $inc: { views: 1 },
          $set: { appId },
        },
        { upsert: true }
      );
    await client
      .db()
      .collection(COLL_VIEWS)
      .updateOne(
        {
          userID: userId,
          content_ID: mediumId,
          appId,
        },
        {
          $inc: { numviews: 1 },
          $set: {
            appId,
          },
        },
        { upsert: true }
      );
    return true;
  } finally {
    client.close();
  }
};
