import CloudWatchEvents from 'aws-sdk/clients/cloudwatchevents';
import Lambda from 'aws-sdk/clients/lambda';
import i18n from 'i18n';
import winston from 'winston';
import { MongoClient } from 'mongodb';
import '../locales/fr.json';
import '../locales/en.json';

import {
  getRuleName,
  getTargetId,
  getStatementId,
} from './tools';

const cloudwatchevents = new CloudWatchEvents({
  region: process.env.REGION,
});
const lambda = new Lambda({
  region: process.env.REGION,
});
i18n.configure({
  directory: '../locales',
});

const {
  BLAST_NOTIF,
  BLAST_TEXT,
  COLL_ARTISTS,
  COLL_ARTISTS_FAV,
  COLL_LINEUPS,
  COLL_PUSH_NOTIFICATIONS,
  COLL_STAGES,
  COLL_USERS,
  DB_NAME,
  MONGO_URL,
  STAGE,
  USE_BLAST_TEXT,
} = process.env;

export default async (lineupId, appId) => {
  const client = await MongoClient.connect(MONGO_URL);
  try {
    const toNotify = await client
      .db(DB_NAME)
      .collection(COLL_LINEUPS)
      .aggregate([
        { $match: { _id: lineupId } },
        {
          $lookup: {
            from: COLL_ARTISTS_FAV,
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
            from: COLL_PUSH_NOTIFICATIONS,
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
            from: COLL_USERS,
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
            from: COLL_ARTISTS,
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
            from: COLL_STAGES,
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
    winston.info('Notifications length', toNotify.length);
    if (toNotify.length !== 0) {
      const promises = toNotify.map(async (locale) => {
        const { artistName, stageName } = locale;
        i18n.setLocale(locale._id.split('-')[0]);
        if (locale.endpoints.length > 0) {
          const paramsNotif = {
            FunctionName: BLAST_NOTIF,
            Payload: JSON.stringify({
              artistName,
              endpoints: locale.endpoints,
              message: i18n.__('msg_notif', stageName),
              opts: { appId },
            }),
          };
          winston.info('Notifications will be sent to', locale.endpoints);
          await lambda.invoke(paramsNotif).promise();
        }
        winston.info('Text messages activated:', USE_BLAST_TEXT);
        if (locale.phone.length > 0 && USE_BLAST_TEXT === 'true') {
          const paramsText = {
            FunctionName: BLAST_TEXT,
            Payload: JSON.stringify({
              phones: locale.phone,
              message: i18n.__('msg_text', { artistName, stageName }),
              opts: { appId },
            }),
          };
          winston.info('Text messages will be sent to', locale.phone);
          await lambda.invoke(paramsText).promise();
        }
      });
      await Promise.all(promises);
    }
    const notifyFuncName = `lineup-${STAGE}-notifyLineup`;
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
      winston.error('Failed to delete cronjob', e);
      throw e;
    }
    return true;
  } finally {
    client.close();
  }
};
