import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { sendEmailMailgunTemplate } from '../../libs/email/sendEmailMailgun';
import { formatMessage, intlInit } from '../../libs/intl/intl';

const { COLL_FORMS } = mongoCollections;

// const CORP_EMAIL_JIMMY = 'jimmy@crowdaa.com';
const CORP_EMAIL_ANTHONY = 'anthony@crowdaa.com';
const CORP_EMAIL_ERIC = 'eric.eloy@crowdaa.com';
const CORP_EMAIL_LUC = 'luc@crowdaa.com';
const CORP_EMAIL_OB = 'ob@crowdaa.com';
const CORP_EMAIL_SARAH = 'sarah@crowdaa.com';
const CORP_EMAIL_SUPPORT = 'support@crowdaa.com';
const CORP_EMAIL_VIGILE = 'vigile@crowdaa.com';

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
      type: 'register',
      processed: false,
      data,
    };

    await dbForm.insertOne(form);

    const lang = ((['fr', 'en'].indexOf(data.region) >= 0) ? data.region : 'en');

    await intlInit(lang);

    await sendEmailMailgunTemplate(
      `No reply <${CORP_EMAIL_SUPPORT}>`,
      'support@crowdaa.com',
      formatMessage('forms:postFormRegisterEmail.title'),
      `send_register_crowdaa_team_${lang}`,
      data,
      {
        cc: [
          CORP_EMAIL_ANTHONY,
          CORP_EMAIL_ERIC,
          CORP_EMAIL_LUC,
          CORP_EMAIL_OB,
          CORP_EMAIL_SARAH,
          CORP_EMAIL_VIGILE,
        ].join(', '),
      },
    );

    await sendEmailMailgunTemplate(
      `No reply <${CORP_EMAIL_SUPPORT}>`,
      data.email,
      formatMessage('forms:postFormRegisterEmail.title'),
      `send_register_crowdaa_owner_${lang}`,
      data,
      {
        bcc: [
          CORP_EMAIL_ANTHONY,
          CORP_EMAIL_ERIC,
          CORP_EMAIL_LUC,
          CORP_EMAIL_OB,
          CORP_EMAIL_SARAH,
          CORP_EMAIL_SUPPORT,
          CORP_EMAIL_VIGILE,
        ].join(', '),
      },
    );

    return (form);
  } finally {
    client.close();
  }
};
