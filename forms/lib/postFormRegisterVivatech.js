import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { sendEmailMailgunTemplate } from '../../libs/email/sendEmailMailgun';
import { formatMessage, intlInit } from '../../libs/intl/intl';

const { COLL_FORMS } = mongoCollections;

const CORP_EMAIL_ERIC = 'eric.eloy@crowdaa.com';
const CORP_EMAIL_SUPPORT = 'support@crowdaa.com';

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
      type: 'vivatech',
      processed: false,
      data,
    };

    await dbForm.insertOne(form);

    const lang = 'fr';

    await intlInit(lang);

    let mailData = {
      from: `No reply <${CORP_EMAIL_SUPPORT}>`,
      to: `${CORP_EMAIL_SUPPORT}`,
      title: formatMessage('forms:postFormRegisterEmail.title'),
      template: 'send_register_crowdaa_team_vivatech',
      data: { ...data },
      extra: {
        cc: [
          CORP_EMAIL_ERIC,
        ].join(', '),
      },
      lang,
    };

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
      to: CORP_EMAIL_ERIC,
      title: formatMessage('forms:postFormRegisterEmail.title'),
      template: 'send_register_crowdaa_owner_vivatech',
      data: { ...data },
      lang,
    };

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
