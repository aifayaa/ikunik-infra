import CloudWatchEvents from 'aws-sdk/clients/cloudwatchevents';
import Lambda from 'aws-sdk/clients/lambda';
import i18n from 'i18n';
import { MongoClient } from 'mongodb';
import {
  getRuleName,
  getTargetId,
  getStatementId,
} from './tools';

import '../locales/fr.json';
import '../locales/en.json';

const THRESHOLD = 15; // minutes

const {
  REGION,
  MONGO_URL,
  DB_NAME,
  COLL_LINEUPS,
  STAGE,
} = process.env;

const cloudwatchevents = new CloudWatchEvents({
  region: REGION,
});

const lambda = new Lambda({
  region: REGION,
});

i18n.configure({
  directory: '../locales',
});

export default async (lineupId, appId) => {
  const client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;
  try {
    const lineup = await client
      .db(DB_NAME)
      .collection(COLL_LINEUPS)
      .findOne({
        _id: lineupId,
        appIds: { $elemMatch: { $eq: appId } },
      });
    const jobId = getRuleName(lineupId);
    const { startDate } = lineup;
    const wDate = new Date(new Date(startDate).valueOf() - (THRESHOLD * 60000));
    const min = wDate.getMinutes();
    const hours = wDate.getHours();
    const day = wDate.getDate();
    const month = wDate.getMonth() + 1;
    const notifyFuncName = `lineup-${STAGE}-notifyLineup`;
    const paramsRule = {
      Name: jobId,
      Description: `Cron job for ${lineupId}/${startDate} to trigger on ${wDate}`,
      ScheduleExpression: `cron(${min} ${hours} ${day} ${month} ? *)`,
    };
    const paramsTarget = {
      Rule: jobId,
      Targets: [
        {
          Arn: `arn:aws:lambda:${REGION}:630176884077:function:${notifyFuncName}`,
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
  } finally {
    client.close();
  }
};
