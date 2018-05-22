import { MongoClient } from 'mongodb';
import CloudWatchEvents from 'aws-sdk/clients/cloudwatchevents';
import Lambda from 'aws-sdk/clients/lambda';
import uuidv4 from 'uuid/v4';
import i18n from 'i18n';

import './locales/fr.json';
import './locales/en.json';

const THRESHOLD = 15; // minutes

const cloudwatchevents = new CloudWatchEvents({
  region: process.env.REGION,
});

const lambda = new Lambda({
  region: process.env.REGION,
});

i18n.configure({
  directory: './locales',
});

const getRuleName = lineupId => `CronJobLineup-${lineupId}`;
const getTargetId = lineupId => `CronLineupTarget-${lineupId}`;
const getStatementId = lineupId => `${getRuleName(lineupId)}_permission`;

const doGetLineup = async (someId, type) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const selector = {};
    selector[type] = someId;
    const lineup = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .aggregate([
        { $match: selector },
        {
          $lookup: {
            from: 'festivals',
            localField: 'festivalId',
            foreignField: '_id',
            as: 'festival',
          },
        },
        {
          $unwind: {
            path: '$festival',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: 'artists',
            localField: 'artistId',
            foreignField: '_id',
            as: 'artist',
          },
        },
        {
          $unwind: {
            path: '$artist',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: 'stages',
            localField: 'stageId',
            foreignField: '_id',
            as: 'stage',
          },
        },
        {
          $unwind: {
            path: '$stage',
            preserveNullAndEmptyArrays: false,
          },
        },
      ]).toArray();
    return { lineup };
  } finally {
    client.close();
  }
};

const doPostLineup = async (festivalId, stageId, artistId, startDate, endDate, ticketingURL) => {
  const lineupId = uuidv4();
  const wDate = new Date(new Date(startDate).valueOf() - (THRESHOLD * 60000));
  const min = wDate.getMinutes();
  const hours = wDate.getHours();
  const day = wDate.getDate();
  const month = wDate.getMonth() + 1;
  const jobId = getRuleName(lineupId);
  const notifyFuncName = `lineup-${process.env.STAGE}-notifyLineup`;
  const paramsRule = {
    Name: jobId,
    Description: `Cron job for ${lineupId}/${startDate} to trigger on ${wDate}`,
    ScheduleExpression: `cron(${min} ${hours} ${day} ${month} ? *)`,
  };
  const paramsTarget = {
    Rule: jobId,
    Targets: [
      {
        Arn: `arn:aws:lambda:us-east-1:630176884077:function:${notifyFuncName}`,
        Id: getTargetId(lineupId),
        Input: JSON.stringify({ lineupId }),
      },
    ],
  };
  const paramsLambda = {
    Action: 'lambda:InvokeFunction',
    FunctionName: notifyFuncName,
    Principal: 'events.amazonaws.com',
    StatementId: getStatementId(lineupId),
  };

  await cloudwatchevents.putRule(paramsRule).promise();
  await cloudwatchevents.putTargets(paramsTarget).promise();
  await lambda.addPermission(paramsLambda).promise();

  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .insertOne({
        _id: lineupId,
        festivalId,
        stageId,
        artistId,
        startDate,
        endDate,
        ticketingURL,
      });
    return true;
  } finally {
    client.close();
  }
};

const doCreateNotify = async (lineupId) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL);
    const lineup = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .findOne({ _id: lineupId });
    const jobId = getRuleName(lineupId);
    const { startDate } = lineup;
    const wDate = new Date(new Date(startDate).valueOf() - (THRESHOLD * 60000));
    const min = wDate.getMinutes();
    const hours = wDate.getHours();
    const day = wDate.getDate();
    const month = wDate.getMonth() + 1;
    const notifyFuncName = `lineup-${process.env.STAGE}-notifyLineup`;
    const paramsRule = {
      Name: jobId,
      Description: `Cron job for ${lineupId}/${startDate} to trigger on ${wDate}`,
      ScheduleExpression: `cron(${min} ${hours} ${day} ${month} ? *)`,
    };
    const paramsTarget = {
      Rule: jobId,
      Targets: [
        {
          Arn: `arn:aws:lambda:us-east-1:630176884077:function:${notifyFuncName}`,
          Id: getTargetId(lineupId),
          Input: JSON.stringify({ lineupId }),
        },
      ],
    };
    const paramsLambda = {
      Action: 'lambda:InvokeFunction',
      FunctionName: notifyFuncName,
      Principal: 'events.amazonaws.com',
      StatementId: getStatementId(lineupId),
    };
    await cloudwatchevents.putRule(paramsRule).promise();
    await cloudwatchevents.putTargets(paramsTarget).promise();
    await lambda.addPermission(paramsLambda).promise();
    return true;
  } catch (e) {
    throw e;
  } finally {
    client.close();
  }
};

const doCreateNotifyAll = async () => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL);
    const lineup = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .find({ startDate: { $gt: new Date() } }, { projection: { _id: 1 } }).toArray();
    const promises = lineup.map(async (lid) => {
      await doCreateNotify(lid);
    });
    await Promise.all(promises);
    return true;
  } catch (e) {
    throw e;
  } finally {
    client.close();
  }
};

const doNotifyLineup = async (lineupId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const toNotify = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .aggregate([
        { $match: { _id: lineupId } },
        {
          $lookup: {
            from: 'artistsFav',
            localField: 'artistId',
            foreignField: 'artistId',
            as: 'artistsFav',
          },
        },
        {
          $unwind: {
            path: '$artistsFav', preserveNullAndEmptyArrays: true,
          },
        },
        { $match: { 'artistsFav.isFavorite': true } },
        {
          $lookup: {
            from: 'pushNotifications',
            localField: 'artistsFav.userId',
            foreignField: 'userId',
            as: 'endpoint',
          },
        },
        {
          $unwind: {
            path: '$endpoint', preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'artistsFav.userId',
            foreignField: '_id',
            as: 'users',
          },
        },
        {
          $unwind: {
            path: '$users', preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'artists',
            localField: 'artistId',
            foreignField: '_id',
            as: 'artists',
          },
        },
        {
          $unwind: {
            path: '$artists', preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'stages',
            localField: 'stageId',
            foreignField: '_id',
            as: 'stages',
          },
        },
        {
          $unwind: {
            path: '$stages', preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: '$users.locale',
            endpoints: {
              $addToSet: {
                Platform: '$endpoint.Platform',
                EndpointArn: '$endpoint.EndpointArn',
              },
            },
            phone: { $addToSet: '$users.profile.phone' },
            artistName: { $first: '$artists.artistName' },
            stageName: { $first: '$stages.name' },
          },
        },
      ]).toArray();
    console.log('Notifications length', toNotify.length);
    if (toNotify.length !== 0) {
      const promises = toNotify.map(async (locale) => {
        const { artistName, stageName } = locale;
        i18n.setLocale(locale._id.split('-')[0]);
        if (locale.endpoints.length > 0) {
          const paramsNotif = {
            FunctionName: process.env.BLAST_NOTIF,
            Payload: JSON.stringify({
              artistName,
              endpoints: locale.endpoints,
              message: i18n.__('msg_notif', stageName),
            }),
          };
          console.log('Notifications will be sent to', locale.endpoints);
          await lambda.invoke(paramsNotif).promise();
        }
        console.log('Text messages activated:', process.env.USE_BLAST_TEXT);
        if (locale.phone.length > 0 && process.env.USE_BLAST_TEXT === 'true') {
          const paramsText = {
            FunctionName: process.env.BLAST_TEXT,
            Payload: JSON.stringify({
              phones: locale.phone,
              message: i18n.__('msg_text', { artistName, stageName }),
            }),
          };
          console.log('Text messages will be sent to', locale.phone);
          await lambda.invoke(paramsText).promise();
        }
      });
      await Promise.all(promises);
    }
    const notifyFuncName = `lineup-${process.env.STAGE}-notifyLineup`;
    const jobId = getRuleName(lineupId);
    const targetId = getTargetId(lineupId);
    const permId = getStatementId(lineupId);
    try {
      await lambda.removePermission({
        FunctionName: notifyFuncName,
        StatementId: permId,
      }).promise();
      await cloudwatchevents.removeTargets({ Rule: jobId, Ids: [targetId] }).promise();
      await cloudwatchevents.deleteRule({ Name: jobId }).promise();
    } catch (e) {
      console.error('Failed to delete cronjob', e);
      throw e;
    }
    return true;
  } finally {
    client.close();
  }
};

export const handleGetLineup = async (event, context, callback) => {
  try {
    const someId = event.pathParameters.id;
    let type;
    switch (event.resource.split('/')[1]) {
      case 'artists':
        type = 'artistId';
        break;
      case 'stages':
        type = 'stageId';
        break;
      case 'festivals':
        type = 'festivalId';
        break;
      default:
        type = undefined;
    }
    const results = await doGetLineup(someId, type);
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
    };
    callback(null, response);
  }
};

export const handlePostLineup = async (event, context, callback) => {
  try {
    const {
      festivalId,
      stageId,
      artistId,
      startDate,
      endDate,
      ticketingURL,
    } = JSON.parse(event.body);

    if (!festivalId || !stageId || !artistId || !startDate || !endDate || !ticketingURL) {
      throw new Error('Bad arguments');
    }

    const results = await doPostLineup(
      festivalId,
      stageId,
      artistId,
      startDate,
      endDate,
      ticketingURL,
    );
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
    };
    callback(null, response);
  }
};

export const handlerNotifyLineup = async (event, context, callback) => {
  try {
    const { lineupId } = event;
    const results = await doNotifyLineup(lineupId);
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
    };
    callback(null, response);
  }
};

export const handlerCreateNotifyLineup = async (event, context, callback) => {
  try {
    const lineupId = event.pathParameters.id;
    const results = await doCreateNotify(lineupId);
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
    };
    callback(null, response);
  }
};

export const handlerCreateNotifyAllLineup = async (event, context, callback) => {
  try {
    const results = await doCreateNotifyAll();
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
    };
    callback(null, response);
  }
};
