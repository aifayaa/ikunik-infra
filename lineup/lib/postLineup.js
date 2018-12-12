import CloudWatchEvents from 'aws-sdk/clients/cloudwatchevents';
import Lambda from 'aws-sdk/clients/lambda';
import uuidv4 from 'uuid/v4';
import { MongoClient } from 'mongodb';
import {
  getRuleName,
  getTargetId,
  getStatementId,
} from './tools';

const lambda = new Lambda({
  region: process.env.REGION,
});

const THRESHOLD = 15; // minutes

const cloudwatchevents = new CloudWatchEvents({
  region: process.env.REGION,
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
) => {
  const lineupId = uuidv4();
  if (blastEnabled) {
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
          Arn: `arn:aws:lambda:${process.env.REGION}:630176884077:function:${notifyFuncName}`,
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

  const client = await MongoClient.connect(process.env.MONGO_URL);
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
  };
  try {
    await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .insertOne(lineup);
    return lineup;
  } finally {
    client.close();
  }
};
