import QRCode from 'qrcode';
import moment from 'moment';

import generateTicket from './generateTicket';
import generateTicketPdf from './generateTicketPdf';
import getTicket from './getTicket';
import getTicketInfos from './getTicketInfos';
import sendTicket from './sendTicket';

export default async (ticketId) => {
  try {
    const ticket = await getTicket(ticketId);
    const [ticketInfo] = await getTicketInfos(ticket.categoryId);
    const { organisation } = ticketInfo.lineup || {};
    const data = {
      eventName: (ticketInfo.lineup.name || ''),
      date: `${moment(ticketInfo.lineup.date).format('DD/MM/YYYY')} - ${moment(ticketInfo.lineup.date).format('HH:mm')}`,
      stageName: ticketInfo.stage.name || '',
      ticketCategory: ticketInfo.name,
      ticketPrice: ticket.price,
      ticketName: `${ticket.owner.firstname || ''} ${ticket.owner.lastname || ''}`,
      ticketId,
      organisationName: organisation.name,
      organisationAdr: organisation.addr,
      organisationMail: organisation.email,
      orderDate: moment(ticket.createdAt).format('DD/MM/YYYY HH:mm'),
      img: ticketInfo.lineup.img || 'https://d1m3cwh7hj7lba.cloudfront.net/crowdaa-logos/crowdaa_logo_pink2.png',
    };

    const qrcode = await QRCode.toDataURL(ticketId, { width: 256 });
    const tpl = generateTicket({ type: 'standardTickets', data, qrcode });
    const tplPdf = generateTicketPdf({ type: 'standardTickets', data, qrcode });
    const ticketMail = {
      subject: `[Crowdaa] Votre billet électronique pour ${ticketInfo.lineup.name || ''}`,
      body: tpl,
      to: ticket.owner.email,
      pdf: tplPdf,
      attachementName: `Billet_${ticketInfo.lineup.name || ''}.pdf`,
    };
    await sendTicket(ticketMail);
    return true;
  } catch (e) {
    throw e;
  }
};
