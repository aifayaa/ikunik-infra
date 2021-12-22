import CloudWatchEvents from 'aws-sdk/clients/cloudwatchevents';
import Lambda from 'aws-sdk/clients/lambda';
import uuidv4 from 'uuid/v4';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  getRuleName,
  getTargetId,
  getStatementId,
} from './tools';

const {
  REGION,
  STAGE,
} = process.env;

const {
  COLL_LINEUPS,
} = mongoCollections;

const lambda = new Lambda({
  region: REGION,
});

const THRESHOLD = 15; // minutes

const cloudwatchevents = new CloudWatchEvents({
  region: REGION,
});

export default async (
  festivalId = null,
  stageId,
  artistId,
  startDate,
  endDate,
  ticketingURL = null,
  organisation = null,
  name = null,
  blastEnabled = false,
  pictureId,
  appId,
) => {
  const lineupId = uuidv4();
  if (blastEnabled) {
    const wDate = new Date(new Date(startDate).valueOf() - (THRESHOLD * 60000));
    const min = wDate.getMinutes();
    const hours = wDate.getHours();
    const day = wDate.getDate();
    const month = wDate.getMonth() + 1;
    const jobId = getRuleName(lineupId);
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
  }

  const client = await MongoClient.connect();
  const lineup = {
    _id: lineupId,
    festivalId,
    stageId,
    artistId,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    ticketingURL,
    organisation,
    name,
    pictureId,
    appId,
  };
  try {
    await client
      .db()
      .collection(COLL_LINEUPS)
      .insertOne(lineup);
    return lineup;
  } finally {
    client.close();
  }
};
