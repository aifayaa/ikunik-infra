import Lambda from 'aws-sdk/clients/lambda';
import { MongoClient } from 'mongodb';
import { URL } from 'url';

import generateSignedURL from '../libs/aws/generateSignedURL';
import isMediaLocked from './lib/isMediaLocked';

const lambda = new Lambda({
  region: process.env.REGION,
});

function makeResponse(statusCode, error, result) {
  const res = {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
  if (error) {
    res.body = error.message;
    return res;
  }
  res.body = JSON.stringify(result);
  return res;
}

const doCheckUserMedia = async (userId, mediaIds) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const audios = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_AUDIOS)
      .find({ _id: { $in: mediaIds }, fromUserId: { $ne: userId } })
      .count();
    const videos = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_VIDEOS)
      .find({ _id: { $in: mediaIds }, fromUserId: { $ne: userId } })
      .count();
    return audios === 0 && videos === 0;
  } finally {
    client.close();
  }
};

const doGetMedium = async (userId, mediumType, mediumId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    let medium;
    switch (mediumType) {
      case 'audio':
        medium = await client
          .db(process.env.DB_NAME)
          .collection(process.env.COLL_AUDIOS)
          .findOne({ _id: mediumId });
        break;
      case 'video':
        medium = await client
          .db(process.env.DB_NAME)
          .collection(process.env.COLL_VIDEOS)
          .findOne({ _id: mediumId });
        break;
      case 'all':
        medium = await client
          .db(process.env.DB_NAME)
          .collection(process.env.COLL_AUDIOS)
          .findOne({ _id: mediumId });
        if (!medium) {
          medium = await client
            .db(process.env.DB_NAME)
            .collection(process.env.COLL_VIDEOS)
            .findOne({ _id: mediumId });
        }
        break;
      default:
        throw new Error('wrong type');
    }
    if (!medium) throw new Error('medium not found');
    if (medium.pictureId) {
      // get picture
      const picture = await client
        .db(process.env.DB_NAME)
        .collection('pictures')
        .findOne({ _id: medium.pictureId });
      if (picture) {
        medium.picture = picture;
      }
    }
    if (medium.collection && medium.filename && medium.fileObj_ID && medium.url) {
      medium.url = generateSignedURL(
        `${medium.collection === 'audio' ? 'MusicStorage' : 'VideoStorage'}/${medium.fileObj_ID}-${
          medium.filename
        }`,
        new URL(medium.url).host,
      );
    }

    const params = {
      FunctionName: `subscriptions-${process.env.STAGE}-isUserSubscribed`,
      Payload: JSON.stringify({ userId, subIds: medium.subscriptionIds }),
    };
    const { Payload } = await lambda.invoke(params).promise();
    const { body } = JSON.parse(Payload);
    if (!JSON.parse(body)) {
      delete medium.url;
      delete medium.video480Url;
      medium.isLocked = true;
    }
    const { state } = await isMediaLocked(userId, medium);
    // medium.isLocked = isLocked; TO NOT imply mobile diff
    medium.lockState = state;
    return medium;
  } finally {
    client.close();
  }
};

const doPostMediumView = async (userId, mediumType, mediumId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    let medium;
    let mediaCol;
    switch (mediumType) {
      case 'audio':
        mediaCol = 'audio';
        medium = await client
          .db(process.env.DB_NAME)
          .collection(process.env.COLL_AUDIOS)
          .findOneAndUpdate(
            { _id: mediumId },
            {
              $inc: { views: 1 },
              $set: { lastView: new Date() },
            },
          );
        break;
      case 'video':
        mediaCol = 'video';
        medium = await client
          .db(process.env.DB_NAME)
          .collection(process.env.COLL_VIDEOS)
          .findOneAndUpdate(
            { _id: mediumId },
            {
              $inc: { views: 1 },
              $set: { lastView: new Date() },
            },
          );
        break;
      case 'all':
        mediaCol = 'audio';
        medium = await client
          .db(process.env.DB_NAME)
          .collection(process.env.COLL_AUDIOS)
          .findOneAndUpdate(
            { _id: mediumId },
            {
              $inc: { views: 1 },
              $set: { lastView: new Date() },
            },
          );
        if (!medium) {
          mediaCol = 'video';
          medium = await client
            .db(process.env.DB_NAME)
            .collection(process.env.COLL_VIDEOS)
            .findOneAndUpdate(
              { _id: mediumId },
              {
                $inc: { views: 1 },
                $set: { lastView: new Date() },
              },
            );
        }
        break;
      default:
        throw new Error('wrong type');
    }

    medium = medium.value;
    if (!medium) throw new Error('medium not found');
    const { distribution } = medium;

    // Deadline should be update only if it's freePerDay distros
    if (distribution && distribution.includes('PerDay')) {
      const deadlines = await client
        .db(process.env.DB_NAME)
        .collection('deadlines')
        .findOne({
          userId,
          content_ID: mediumId,
        });
      const { deadlineDate } = deadlines || {};

      if ((deadlines && new Date() > deadlineDate) || !deadlines) {
        // Deadline expired or no deadline, new one
        console.log(
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
          .db(process.env.DB_NAME)
          .collection('deadlines')
          .updateOne(
            {
              userId,
              content_ID: mediumId,
            },
            {
              $set: {
                deadlineDate: newDate,
                lastView: newLastView,
              },
            },
            {
              upsert: true,
            },
          );
      } else {
        console.log('update an existing deadline');
        // Simple update the deadline to decrement
        await client
          .db(process.env.DB_NAME)
          .collection('deadlines')
          .updateOne(
            {
              userId,
              content_ID: mediumId,
            },
            {
              $inc: {
                lastView: -1,
              },
            },
            {
              upsert: true,
            },
          );
      }
    }

    await client
      .db(process.env.DB_NAME)
      .collection('Project')
      .updateOne(
        { _id: medium.project_ID },
        {
          $inc: { views: 1 },
          $set: { lastView: new Date() },
        },
      );
    await client
      .db(process.env.DB_NAME)
      .collection('contentByUserMetric')
      .updateOne(
        { user_ID: userId, content_ID: mediumId },
        {
          $inc: { views: 1 },
          $set: { date: new Date(), collection: mediaCol },
        },
        { upsert: true },
      );

    // update the total number for Crowdaa
    // Historic code
    await client
      .db(process.env.DB_NAME)
      .collection('metrics')
      .updateOne(
        { _id: '3FD4vNCuXXxtjN3fD' },
        {
          $inc: { views: 1 },
        },
      );
    await client
      .db(process.env.DB_NAME)
      .collection('views')
      .updateOne(
        { userID: userId, content_ID: mediumId },
        {
          $inc: { numviews: 1 },
        },
        { upsert: true },
      );
    return true;
  } finally {
    client.close();
  }
};

export const handleGetMedium = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const mediumType = event.pathParameters.type;
    const mediumId = event.pathParameters.id;
    const results = await doGetMedium(userId, mediumType, mediumId);
    callback(null, makeResponse(200, null, results));
  } catch (e) {
    callback(null, makeResponse(500, e));
  }
};

export const handlePostMediumView = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const mediumType = event.pathParameters.type;
    const mediumId = event.pathParameters.id;
    const results = await doPostMediumView(userId, mediumType, mediumId);
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};

export const handleCheckUserMedia = async ({ userId, mediaIds }, context, callback) => {
  try {
    const results = await doCheckUserMedia(userId, mediaIds);
    callback(null, makeResponse(200, null, results));
  } catch (e) {
    callback(null, makeResponse(500, e));
  }
};

export const handleGetMediumLockState = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const mediumType = event.pathParameters.type;
    const mediumId = event.pathParameters.id;
    const medium = await doGetMedium(userId, mediumType, mediumId);
    const result = await isMediaLocked(userId, medium);
    const response = {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify(e.message),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
