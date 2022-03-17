import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { sendEmailMailgunTemplate } from '../../libs/email/sendEmailMailgun';
import { formatMessage, intlInit } from '../../libs/intl/intl';

const { COLL_FORMS } = mongoCollections;

const CORP_EMAIL_CONTACT = 'contact@crowdaa.com';
const CORP_EMAIL_ERIC = 'eric.eloy@crowdaa.com';
// const CORP_EMAIL_JIMMY = 'jimmy@crowdaa.com';
const CORP_EMAIL_OB = 'ob@crowdaa.com';
const CORP_EMAIL_SUPPORT = 'support@crowdaa.com';
const CORP_EMAIL_VIGILE = 'vigile@crowdaa.com';

function manageDistributors(/* mailData */) {
  // const { distributor = '' } = mailData.data;
  // if (mailData.lang === 'en') {
  //   if (mailData.extra.bcc) {
  //     mailData.extra.bcc = `${mailData.extra.bcc}, ${CORP_EMAIL_JIMMY}`;
  //   } else {
  //     mailData.extra.bcc = CORP_EMAIL_JIMMY;
  //   }
  // } else if (distributor.match(/Icone Technologies/i)) {
  //   /* . */
  // }
}

export default async (data = {}) => {
  const client = await MongoClient.connect();

  try {
    const dbForm = client.db().collection(COLL_FORMS);

    if (typeof data.email !== 'string') {
      throw new Error('wrong_argument_type');
    }

    const form = {
      _id: new ObjectID().toString(),
      createdAt: new Date(),
      type: 'affiliate',
      processed: false,
      data,
    };

    await dbForm.insertOne(form);

    const lang = ((['fr', 'en'].indexOf(data.region) >= 0) ? data.region : 'en');

    await intlInit(lang);

    let mailData = {
      from: `No reply <${CORP_EMAIL_SUPPORT}>`,
      to: `${CORP_EMAIL_SUPPORT}`,
      title: formatMessage('forms:postFormRegisterEmail.title'),
      template: `send_register_crowdaa_team_${lang}`,
      data: { ...data },
      extra: {
        cc: [CORP_EMAIL_OB, CORP_EMAIL_VIGILE, CORP_EMAIL_ERIC].join(', '),
      },

      lang,
    };

    manageDistributors(mailData);

    await sendEmailMailgunTemplate(
      mailData.from,
      mailData.to,
      mailData.title,
      mailData.template,
      mailData.data,
      mailData.extra,
    );

    mailData = {
      from: `No reply <${CORP_EMAIL_SUPPORT}>`,
      to: (data.email && data.email.trim()) || CORP_EMAIL_CONTACT,
      title: formatMessage('forms:postFormRegisterEmail.title'),
      template: `send_register_crowdaa_owner_${lang}`,
      data: { ...data },
      extra: {
        bcc: [CORP_EMAIL_SUPPORT, CORP_EMAIL_OB, CORP_EMAIL_VIGILE, CORP_EMAIL_ERIC].join(', '),
      },

      lang,
    };

    manageDistributors(mailData);

    await sendEmailMailgunTemplate(
      mailData.from,
      mailData.to,
      mailData.title,
      mailData.template,
      mailData.data,
      mailData.extra,
    );

    return (form);
  } finally {
    client.close();
  }
};
