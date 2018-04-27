import { MongoClient } from 'mongodb';
import CloudWatchEvents from 'aws-sdk/clients/cloudwatchevents';
import Lambda from 'aws-sdk/clients/lambda';
import uuidv4 from 'uuid/v4';

const THRESHOLD = 15; // minutes

const cloudwatchevents = new CloudWatchEvents({
  region: process.env.REGION,
});

const lambda = new Lambda({
  region: process.env.REGION,
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
            from: 'scenes',
            localField: 'sceneId',
            foreignField: '_id',
            as: 'scene',
          },
        },
        {
          $unwind: {
            path: '$scene',
            preserveNullAndEmptyArrays: false,
          },
        },
      ]).toArray();
    return { lineup };
  } finally {
    client.close();
  }
};

const doPostLineup = async (festivalId, sceneId, artistId, startDate, endDate, ticketingURL) => {
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
  console.log('====', getStatementId(lineupId), jobId, getTargetId(lineupId));
  await cloudwatchevents.putRule(paramsRule).promise();
  await cloudwatchevents.putTargets(paramsTarget).promise();
  await lambda.addPermission(paramsLambda).promise();

  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .insertOne({
        _id: lineupId,
        festivalId,
        sceneId,
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
            from: 'scenes',
            localField: 'sceneId',
            foreignField: '_id',
            as: 'scenes',
          },
        },
        {
          $unwind: {
            path: '$scenes', preserveNullAndEmptyArrays: true,
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
            sceneName: { $first: '$scenes.name' },
          },
        },
      ]).toArray();
    if (toNotify.length === 0) return true;
    const promises = toNotify.map(async (locale) => {
      console.log('======', locale._id.split('-')[0]);
      const { artistName, sceneName } = locale;
      const paramsNotif = {
        FunctionName: process.env.BLAST_NOTIF,
        Payload: JSON.stringify({
          artistName,
          endpoints: locale.endpoints,
          message: `Votre concert va bientôt commencer sur la scène du ${sceneName} !!!`,
        }),
      };
      const paramsText = {
        FunctionName: process.env.BLAST_TEXT,
        Payload: JSON.stringify({
          phones: locale.phone,
          message: `${artistName} : Votre concert va bientôt commencer sur la scène du ${sceneName} !!!`,
        }),
      };
      console.log('>>>>>>>', paramsNotif, paramsText);
      await lambda.invoke(paramsNotif).promise();
      await lambda.invoke(paramsText).promise();
    });
    await Promise.all(promises);
    const notifyFuncName = `lineup-${process.env.STAGE}-notifyLineup`;
    const jobId = getRuleName(lineupId);
    const targetId = getTargetId(lineupId);
    const permId = getStatementId(lineupId);
    console.log('====', permId, jobId, targetId);
    try {
      await lambda.removePermission({
        FunctionName: notifyFuncName,
        StatementId: permId,
      }).promise();
      console.log('permm.....');
      await cloudwatchevents.removeTargets({ Rule: jobId, Ids: [targetId] }).promise();
      console.log('targets.....');
      await cloudwatchevents.deleteRule({ Name: jobId }).promise();
      console.log('rule......');
    } catch (e) {
      console.log(')))))))))))', e);
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
      case 'scenes':
        type = 'sceneId';
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
      sceneId,
      artistId,
      startDate,
      endDate,
      ticketingURL,
    } = JSON.parse(event.body);

    if (!festivalId || !sceneId || !artistId || !startDate || !endDate || !ticketingURL) {
      throw new Error('Bad arguments');
    }

    const results = await doPostLineup(
      festivalId,
      sceneId,
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
