import Lambda from 'aws-sdk/clients/lambda';
import moment from 'moment';
import QRCode from 'qrcode';
import { MongoClient } from 'mongodb';

import getTicketInfos from './getTicketInfos';
import insertTicket from './insertTicket';
import generateTicket from './generateTicket';
import removeCredits from '../../credits/lib/removeCredits';

const lambda = new Lambda({
  region: process.env.REGION,
});

export default async (userId, categoryId, lastName, firstName, email) => {
  // TODO manage transaction to verify ticket available each time
  let ticketInfo = await getTicketInfos(categoryId);
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

  let ticketId;
  const { price } = ticketInfo;
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  let opts;
  let session;
  try {
    session = client.startSession();
    session.startTransaction();
    opts = { session, returnOriginal: false };
    const ticketCat = await client.db(process.env.DB_NAME).collection('ticketCategories')
      .findOneAndUpdate({
        _id: categoryId,
      }, {
        $inc: { remaining: -1 },
      }, opts).then(res => res.value);
    if (ticketCat.remaining < 0) {
      throw new Error('no more tickets available');
    }

    ticketId = await insertTicket(
      categoryId,
      price,
      curDate,
      email,
      firstName,
      lastName,
      userId,
      opts,
    );

    await removeCredits(userId, `${price}`, opts);
    await session.commitTransaction();
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    client.close();
    if (session) session.endSession();
  }
  const data = {
    eventName: (ticketInfo.lineup.name || ''),
    date: `${moment(ticketInfo.lineup.date).format('DD/MM/YYYY')} - ${moment(ticketInfo.lineup.date).format('HH:mm')}`,
    stageName: ticketInfo.stage.name || '',
    ticketCategory: ticketInfo.name,
    ticketPrice: price,
    ticketName: `${firstName || ''} ${lastName || ''}`,
    ticketId,
    organisationName: ticketInfo.organisationName,
    organisationAdr: ticketInfo.organisationAdr,
    organisationMail: ticketInfo.organisationMail,
    orderDate: moment(curDate).format('DD/MM/YYYY HH:mm'),
    img: ticketInfo.lineup.img || 'https://d1m3cwh7hj7lba.cloudfront.net/crowdaa-logos/crowdaa_logo_pink2.png',
  };

  const qrcode = await QRCode.toDataURL(ticketId, { width: 128 });
  const tpl = generateTicket({ type: 'standardTickets', data, qrcode });
  const params = {
    FunctionName: `blast-${process.env.STAGE}-blastEmail`,
    Payload: JSON.stringify({
      contacts: [{ email }],
      subject: `[Crowdaa] Votre billet électronique pour ${ticketInfo.lineup.name || ''}`,
      template: { html: tpl },
    }),
  };
  const res = await lambda.invoke(params).promise();
  if (JSON.parse(res.Payload).statusCode !== 200) {
    throw new Error('Failed to send email');
  }
  return { template: tpl };
};
