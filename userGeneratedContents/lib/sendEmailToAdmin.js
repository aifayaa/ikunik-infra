/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import { sendEmailTemplate } from '../../libs/email/sendEmail';
import getAppAdmins from '../../apps/lib/getAppAdmins';
import { objGet } from '../../libs/utils';

const { ADMIN_APP } = process.env;

const { COLL_USERS } = mongoCollections;

export default async (lang, subject, body, appId) => {
  const client = await MongoClient.connect();
  try {
    const superAdmins = await client
      .db()
      .collection(COLL_USERS)
      .find(
        { superAdmin: true, appId: ADMIN_APP },
        { projection: { emails: 1 } }
      )
      .toArray();

    const superAdminsEmails = superAdmins.map(
      ({ emails }) => emails[0].address
    );
    const admins = await getAppAdmins(appId, {
      projection: { 'emails.address': 1 },
    });
    const emails = admins
      .map((admin) => objGet(admin, 'emails.0.address'))
      .filter((x) => x);
    superAdminsEmails.forEach((email) => {
      if (emails.indexOf(email) < 0) {
        emails.push(email);
      }
    });
    const promises = emails.map((email) => {
      /* in case of error, ignore it, just try with best effort */
      try {
        return sendEmailTemplate(lang, 'clients', email, subject, body);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        return null;
      }
    });
    await Promise.all(promises);
  } finally {
    client.close();
  }
};
