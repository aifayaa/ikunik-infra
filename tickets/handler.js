// import { MongoClient } from 'mongodb';
import QRCode from 'qrcode';
import Lambda from 'aws-sdk/clients/lambda';

import { generateTicketsHTML } from './ticketsUtils';

const lambda = new Lambda({
  region: process.env.AWS_REGION,
});

const html = {
  type: 'standardTickets',
  event: {
    name: 'Nom de l\' événement',
    date: '01/02/2018',
    place: 'Cité des Arts',
    organisationName: 'Awax Corporation',
    organisationAdr: '143 rue de la music <br/> 97450 La Réunion',
    organisationMail: 'awax@corp.fr',
    organisationLicence: 'A1745778XEA',
    img: 'http://music-2068.kxcdn.com/MediumStorage/dRfgrvEbPJHYJHQnc-mediumFile_1500logo.jpg',
  },
  ticket: {
    name: 'Prénom Nom',
    cat: 'Plein tarif',
    price: 20,
    _id: 'u765gheaz765756gg65',
    date: '01/05/2018',
  },
};

const doBuyTickets = async (eventId, userId, data) => {
  html.qrcode = await QRCode.toDataURL('0023432', { width: 512 });
  const tpl = generateTicketsHTML(html);
  const params = {
    FunctionName: `blast-${process.env.STAGE}-blastEmail`,
    Payload: JSON.stringify({
      contacts: [{ email: 'djothi@crowdaa.com' }],
      subject: '[Crowdaa] Votre billet électronique pour le concert de Artiste Name',
      template: { html: tpl },
    }),
  };
  const res = await lambda.invoke(params).promise();
  if (JSON.parse(res.Payload).statusCode !== 200) {
    throw new Error('Failed to send email');
  }
  return { template: tpl };
};


export const handleBuyTickets = async (event, context, callback) => {
  try {
    const results = await doBuyTickets();
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
