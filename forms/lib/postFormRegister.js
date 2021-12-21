import MongoClient, { ObjectID } from '../../libs/mongoClient';
import { sendEmailMailgunTemplate } from '../../libs/email/sendEmailMailgun';

const {
  COLL_FORMS,
} = process.env;

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

    await sendEmailMailgunTemplate(
      'No reply <support@crowdaa.com>',
      'support@crowdaa.com',
      'Register',
      'send_register_crowdaa_team_fr',
      data,
      {
        cc: 'ob@crowdaa.com, vigile@crowdaa.com, eric.eloy@crowdaa.com',
      },
    );

    await sendEmailMailgunTemplate(
      'No reply <support@crowdaa.com>',
      data.email,
      'Register',
      'send_register_crowdaa_owner_fr',
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
