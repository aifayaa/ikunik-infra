import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { sendEmailMailgunTemplate } from '../../libs/email/sendEmailMailgun';
import { formatMessage, intlInit } from '../../libs/intl/intl';

const { COLL_FORMS } = mongoCollections;

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
      'No reply <support@crowdaa.com>',
      'support@crowdaa.com',
      formatMessage('forms:postFormRegisterEmail.title'),
      `send_register_crowdaa_team_${lang}`,
      data,
      {
        cc: 'ob@crowdaa.com, vigile@crowdaa.com, eric.eloy@crowdaa.com',
      },
    );

    await sendEmailMailgunTemplate(
      'No reply <support@crowdaa.com>',
      data.email,
      formatMessage('forms:postFormRegisterEmail.title'),
      `send_register_crowdaa_owner_${lang}`,
      data,
      {
        bcc: 'support@crowdaa.com, ob@crowdaa.com, vigile@crowdaa.com, eric.eloy@crowdaa.com',
      },
    );

    return (form);
  } finally {
    client.close();
  }
};
