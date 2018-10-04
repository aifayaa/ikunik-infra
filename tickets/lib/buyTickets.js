import Lambda from 'aws-sdk/clients/lambda';
import moment from 'moment';
import QRCode from 'qrcode';

import getTicketInfos from './getTicketInfos';
import countTickets from './countTickets';
import insertTicket from './insertTicket';
import generateTicket from './generateTicket';

const lambda = new Lambda({
  region: process.env.AWS_REGION,
});

export default async (lineupId, userId, categoryId, lastName, firstName, email) => {
  // TODO manage transaction to verify ticket available each time
  let ticketInfo = await getTicketInfos(lineupId, categoryId);
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

  const tickets = await countTickets(lineupId, categoryId);
  if (tickets >= ticketInfo.quota) {
    throw new Error('ticket quota exceed');
  }

  const { price } = ticketInfo;
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

  const ticketId = await insertTicket(
    lineupId,
    categoryId,
    price,
    curDate,
    email,
    firstName,
    lastName,
  );

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
    date: `${moment(ticketInfo.lineup.date).format('DD/MM/YYYY')} - ${moment(ticketInfo.lineup.date).format('HH:mm')}`,
    stageName: ticketInfo.stage.name || '',
    ticketCategory: ticketInfo.name,
    ticketPrice: price,
    ticketName: `${firstName} ${lastName}`,
    ticketId,
    organisationName: ticketInfo.organisationName,
    organisationAdr: ticketInfo.organisationAdr,
    organisationMail: ticketInfo.organisationMail,
    orderDate: moment(curDate).format('DD/MM/YYYY HH:mm'),
    img: ticketInfo.lineup.img || 'https://d1m3cwh7hj7lba.cloudfront.net/crowdaa-logos/crowdaa_logo_pink2.png',
  };

  const qrcode = await QRCode.toDataURL(ticketId, { width: 512 });
  const tpl = generateTicket({ type: 'standardTickets', data, qrcode });
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
