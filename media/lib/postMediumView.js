import winston from 'winston';
import MongoClient from '../../libs/mongoClient';

const {
  COLL_AUDIOS,
  COLL_CONTENT_BY_USER_METRIC,
  COLL_DEADLINES,
  COLL_METRICS,
  COLL_PROJECTS,
  COLL_VIDEOS,
  COLL_VIEWS,
  DB_NAME,
} = process.env;

export default async (userId, appId, mediumType, mediumId) => {
  const client = await MongoClient.connect();
  try {
    let medium;
    let mediaCol;
    const modifier = {
      $inc: { views: 1 },
      $set: {
        appIds: [appId],
        lastView: new Date(),
      },
    };
    const query = {
      _id: mediumId,
      appIds: { $elemMatch: { $eq: appId } },
    };

    switch (mediumType) {
      case 'audio':
        mediaCol = COLL_AUDIOS;
        ({ value: medium } = await client
          .db(DB_NAME)
          .collection(mediaCol)
          .findOneAndUpdate(query, modifier));
        break;
      case 'video':
        mediaCol = COLL_VIDEOS;
        ({ value: medium } = await client
          .db(DB_NAME)
          .collection(mediaCol)
          .findOneAndUpdate(query, modifier));
        break;
      case 'all':
        mediaCol = COLL_AUDIOS;
        ({ value: medium } = await client
          .db(DB_NAME)
          .collection(mediaCol)
          .findOneAndUpdate(query, modifier));
        if (!medium) {
          mediaCol = COLL_VIDEOS;
          ({ value: medium } = await client
            .db(DB_NAME)
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
      const deadlines = await client
        .db(DB_NAME)
        .collection(COLL_DEADLINES)
        .findOne({
          userId,
          content_ID: mediumId,
          appIds: { $elemMatch: { $eq: appId } },
        });
      const { deadlineDate } = deadlines || {};

      if ((deadlines && new Date() > deadlineDate) || !deadlines) {
        // Deadline expired or no deadline, new one
        winston.info(
          'create a new deadline because',
          `NoDeadline: ${!deadlines}`,
          `expired:${new Date() > deadlineDate}`,
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
          .db(DB_NAME)
          .collection(COLL_DEADLINES)
          .updateOne(
            {
              userId,
              content_ID: mediumId,
              appIds: { $elemMatch: { $eq: appId } },
            },
            {
              $set: {
                deadlineDate: newDate,
                lastView: newLastView,
                appIds: [appId],
              },
            },
            {
              upsert: true,
            },
          );
      } else {
        winston.info('update an existing deadline');
        // Simple update the deadline to decrement
        await client
          .db(DB_NAME)
          .collection(COLL_DEADLINES)
          .updateOne(
            {
              userId,
              content_ID: mediumId,
              appIds: { $elemMatch: { $eq: appId } },
            },
            {
              $inc: {
                lastView: -1,
              },
              $set: {
                appIds: [appId],
              },
            },
            {
              upsert: true,
            },
          );
      }
    }

    await client
      .db(DB_NAME)
      .collection(COLL_PROJECTS)
      .updateOne({
        _id: medium.project_ID,
        appIds: { $elemMatch: { $eq: appId } },
      }, {
        $inc: { views: 1 },
        $set: { lastView: new Date() },
      });
    await client
      .db(DB_NAME)
      .collection(COLL_CONTENT_BY_USER_METRIC)
      .updateOne(
        {
          user_ID: userId,
          content_ID: mediumId,
          appIds: { $elemMatch: { $eq: appId } },
        },
        {
          $inc: { views: 1 },
          $set: {
            date: new Date(),
            appIds: [appId],
            collection: mediaCol,
          },
        },
        { upsert: true },
      );

    // update the total number for Crowdaa
    // Historic code
    await client
      .db(DB_NAME)
      .collection(COLL_METRICS)
      .updateOne(
        { appIds: { $elemMatch: { $eq: appId } } },
        {
          $inc: { views: 1 },
          $set: { appIds: [appId] },
        },
        { upsert: true },
      );
    await client
      .db(DB_NAME)
      .collection(COLL_VIEWS)
      .updateOne(
        {
          userID: userId,
          content_ID: mediumId,
          appIds: { $elemMatch: { $eq: appId } },
        },
        {
          $inc: { numviews: 1 },
          $set: {
            appIds: [appId],
          },
        },
        { upsert: true },
      );
    return true;
  } finally {
    client.close();
  }
};
