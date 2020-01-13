import { MongoClient } from 'mongodb';
import moment from 'moment';
import QRCode from 'qrcode';
import winston from 'winston';

import generateIntId from './generateIntId';
import generateTicket from './generateTicket';
import generateTicketPdf from './generateTicketPdf';
import getTicketInfos from './getTicketInfos';
import insertTicket from './insertTicket';
import removeCredits from '../../credits/lib/removeCredits';

const {
  MONGO_URL,
  DB_NAME,
  COLL_TICKET_CATEGORIES,
} = process.env;

export default async (userId, appId, categoryId, lastName, firstName, email, options = {}) => {
  let ticketInfo = await getTicketInfos(categoryId, appId);
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
  const serial = generateIntId();
  const { price, lineup } = ticketInfo;
  const hasUpperSession = !!options.session;

  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });
  let opts;
  let session;
  try {
    session = options.session || client.startSession();
    if (!hasUpperSession) session.startTransaction();
    opts = { session, returnOriginal: false };
    const ticketCat = await client
      .db(DB_NAME)
      .collection(COLL_TICKET_CATEGORIES)
      .findOneAndUpdate({
        _id: categoryId,
        appIds: { $elemMatch: { $eq: appId } },
      }, {
        $inc: { sold: 1 },
      }, opts).then(res => res.value);
    if (ticketCat.sold >= ticketCat.quota) {
      throw new Error('no more tickets available');
    }
    ticketId = await insertTicket(
      categoryId,
      serial,
      price,
      curDate,
      email,
      firstName,
      lastName,
      userId,
      appId,
      opts,
    );
    
    await removeCredits(userId, appId, `${price}`, opts);
    if (!hasUpperSession) await session.commitTransaction();
  } catch (error) {
    if (session && !hasUpperSession) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    client.close();
    if (session && !hasUpperSession) session.endSession();
  }
  const { organisation } = lineup || {};
  const data = {
    eventName: (lineup.name || ''),
    date: `${moment(lineup.date).format('DD/MM/YYYY')} - ${moment(lineup.date).format('HH:mm')}`,
    stageName: ticketInfo.stage.name || '',
    ticketCategory: ticketInfo.name,
    ticketPrice: price,
    ticketName: `${firstName || ''} ${lastName || ''}`,
    ticketId,
    serial,
    organisationName: organisation.name,
    organisationAdr: organisation.addr,
    organisationMail: organisation.email,
    orderDate: moment(curDate).format('DD/MM/YYYY HH:mm'),
    img: lineup.img || 'https://d1m3cwh7hj7lba.cloudfront.net/crowdaa-logos/crowdaa_logo_pink2.png',
    appIds: [appId],
  };
  try {
    const qrcode = await QRCode.toDataURL(serial, { width: 256 });
    const tpl = generateTicket({ type: 'standardTickets', data, qrcode });
    const tplPdf = generateTicketPdf({ type: 'standardTickets', data, qrcode });
    const ticketMail = {
      subject: `[Crowdaa] Votre billet électronique pour ${lineup.name || ''}`,
      body: tpl,
      to: email,
      pdf: tplPdf,
      attachementName: `Billet_${lineup.name || ''}.pdf`,
    };
    return ticketMail;
  } catch (e) {
    winston.warn('Failed to format ticket', e);
    throw new Error('ticket_formatting_failed');
  }
};
