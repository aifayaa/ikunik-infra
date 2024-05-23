/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import { sendEmailMailgunTemplate } from '../../libs/email/sendEmailMailgun';
import { formatMessage, intlInit } from '../../libs/intl/intl';

const { COLL_FORMS } = mongoCollections;

// const CORP_EMAIL_JIMMY = 'jimmy@crowdaa.com';
const CORP_EMAIL_ANTHONY = 'anthony@crowdaa.com';
const CORP_EMAIL_DJOTHI = 'djothi@crowdaa.com';
const CORP_EMAIL_ERIC = 'eric.eloy@crowdaa.com';
const CORP_EMAIL_LUC = 'luc@crowdaa.com';
const CORP_EMAIL_MILOS = 'milos@crowdaa.com';
const CORP_EMAIL_OB = 'ob@crowdaa.com';
const CORP_EMAIL_SAAD = 'saad@crowdaa.com';
const CORP_EMAIL_SARAH = 'sarah@crowdaa.com';
const CORP_EMAIL_SUPPORT = 'support@crowdaa.com';
const CORP_EMAIL_VIGILE = 'vigile@crowdaa.com';

function manageDistributors(mailData) {
  if (mailData.lang === 'fr') {
    if (mailData.extra.bcc) {
      mailData.extra.bcc = `${mailData.extra.bcc}, ${CORP_EMAIL_DJOTHI}`;
    } else if (mailData.extra.cc) {
      mailData.extra.cc = `${mailData.extra.cc}, ${CORP_EMAIL_DJOTHI}`;
    } else {
      mailData.extra.bcc = CORP_EMAIL_DJOTHI;
    }
  }
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

    const lang = ['fr', 'en'].indexOf(data.region) >= 0 ? data.region : 'en';

    await intlInit(lang);

    let mailData = {
      from: `No reply <${CORP_EMAIL_SUPPORT}>`,
      to: `${CORP_EMAIL_SUPPORT}`,
      title: formatMessage('forms:postFormRegisterEmail.title'),
      template: `affiliate_crowdaa_register_${lang}`,
      data: { ...data },
      extra: {
        cc: [
          CORP_EMAIL_ANTHONY,
          CORP_EMAIL_ERIC,
          CORP_EMAIL_LUC,
          CORP_EMAIL_MILOS,
          CORP_EMAIL_OB,
          CORP_EMAIL_SAAD,
          CORP_EMAIL_SARAH,
          CORP_EMAIL_VIGILE,
        ].join(', '),
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
      mailData.extra
    );

    mailData = {
      from: `No reply <${CORP_EMAIL_SUPPORT}>`,
      to: CORP_EMAIL_SUPPORT,
      title: formatMessage('forms:postFormRegisterEmail.title'),
      template: `affiliate_register_${lang}`,
      data: { ...data },
      extra: {
        bcc: [
          CORP_EMAIL_ANTHONY,
          CORP_EMAIL_ERIC,
          CORP_EMAIL_LUC,
          CORP_EMAIL_MILOS,
          CORP_EMAIL_OB,
          CORP_EMAIL_SAAD,
          CORP_EMAIL_SARAH,
          CORP_EMAIL_SUPPORT,
          CORP_EMAIL_VIGILE,
        ].join(', '),
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
      mailData.extra
    );

    return form;
  } finally {
    client.close();
  }
};
