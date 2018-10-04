import { MongoClient } from 'mongodb';
import QRCode from 'qrcode';
import Lambda from 'aws-sdk/clients/lambda';

import { generateTicketsHTML } from './ticketsUtils';

const lambda = new Lambda({
  region: process.env.AWS_REGION,
});

const doGetInfos = async (lineupId, categoryId) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL);
    return await client.db(process.env.DB_NAME)
      .collection('ticketCategories')
      .aggregate([
        {
          $match: { _id: categoryId, lineupId },
        }, {
          $lookup: {
            from: 'lineup',
            localField: 'lineupId',
            foreignField: '_id',
            as: 'lineup',
          },
        }, {
          $unwind: {
            path: '$lineup',
            preserveNullAndEmptyArrays: true,
          },
        }, {
          $lookup: {
            from: 'stages',
            localField: 'lineup.stageId',
            foreignField: '_id',
            as: 'stage',
          },
        }, {
          $unwind: {
            path: '$stage',
            preserveNullAndEmptyArrays: true,
          },
        },
      ]).toArray();
  } finally {
    client.close();
  }
};

const doTicketsCount = async (lineupId, categoryId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const tickets = await client.db(process.env.DB_NAME).collection('tickets')
      .count({ categoryId, lineupId });
    return tickets;
  } finally {
    client.close();
  }
};

const doBuyTickets = async (lineupId, userId, categoryId, lastName, firstName, email) => {
  // TODO manage transaction to verify ticket available each time
  let ticketInfo = await doGetInfos(lineupId, categoryId);
  if (ticketInfo.length === 0) {
    throw new Error('ticket not found');
  }
  [ticketInfo] = ticketInfo;

  if (!ticketInfo.lineup) {
    throw new Error('lineup not found');
  }

  const curDate = new Date();
  if (new Date(ticketInfo.startSale) > curDate) {
    throw new Error('ticket sale not opened');
  }

  if (new Date(ticketInfo.endSale) < curDate) {
    throw new Error('ticket sale closed');
  }

  const tickets = await doTicketsCount(lineupId, categoryId);
  if (tickets >= ticketInfo.quota) {
    throw new Error('ticket quota exceed');
  }

  const { price } = ticketInfo.price;
  let params = {
    FunctionName: `credits-${process.env.STAGE}-getCredits`,
    Payload: JSON.stringify({ requestContext: { authorizer: { principalId: userId } } }),
  };
  const { Payload } = await lambda.invoke(params).promise();
  const resCredits = JSON.parse(Payload);
  const { statusCode } = resCredits;
  if (statusCode !== 200) throw new Error(`get credits failed: ${statusCode}`);
  const { credits } = JSON.parse(resCredits.body);
  if (!credits) throw new Error('unable to get credits from service response');
  if (credits < price) throw new Error('insufficient credits on user account');

  // TODO // insert ticket

  params = {
    FunctionName: `credits-${process.env.STAGE}-removeCredits`,
    Payload: JSON.stringify({ userId, amount: `${price}` }),
  };
  let res = await lambda.invoke(params).promise();
  res = JSON.parse(res.Payload);
  if (res.statusCode !== 200) {
    throw new Error(`removeCredits handler failed: ${res.body}`);
  }

  const data = {
    eventName: (ticketInfo.lineup.name || ''),
    date: ticketInfo.lineup.date,
    stageName: ticketInfo.stage.name || '',
    ticketCategory: ticketInfo.name,
    ticketPrice: price,
    ticketName: `${firstName} ${lastName}`,
    ticketId: 'XXXXXXXX',
    organisationName: ticketInfo.organisationName,
    organisationAdr: ticketInfo.organisationAdr,
    organisationMail: ticketInfo.organisationMail,
    orderDate: curDate,
    img: ticketInfo.lineup.img || 'https://d1m3cwh7hj7lba.cloudfront.net/crowdaa-logos/crowdaa_logo_pink2.png',
  };

  const qrcode = await QRCode.toDataURL('XXXXXXX', { width: 512 });
  const tpl = generateTicketsHTML({ type: 'standardTickets', data, qrcode });
  params = {
    FunctionName: `blast-${process.env.STAGE}-blastEmail`,
    Payload: JSON.stringify({
      contacts: [{ email }],
      subject: `[Crowdaa] Votre billet électronique pour ${ticketInfo.lineup.name || ''}`,
      template: { html: tpl },
    }),
  };
  res = await lambda.invoke(params).promise();
  if (JSON.parse(res.Payload).statusCode !== 200) {
    throw new Error('Failed to send email');
  }
  return { template: tpl };
};

export const handleBuyTickets = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    if (!event.body) {
      throw new Error('mal formed request');
    }
    const { lineupId, categoryId, lastName, firstName, email } = JSON.parse(event.body);
    if (!lineupId || !categoryId || !email) {
      throw new Error('mal formed request');
    }
    const results = await doBuyTickets(lineupId, userId, categoryId, lastName, firstName, email);
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
