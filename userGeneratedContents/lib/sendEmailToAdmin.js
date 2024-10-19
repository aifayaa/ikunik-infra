/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import { sendEmailTemplate } from '../../libs/email/sendEmail';
import getAppAdmins from '../../apps/lib/getAppAdmins.ts';
import { objGet } from '../../libs/utils';

export default async (lang, subject, body, appId) => {
  const client = await MongoClient.connect();
  try {
    const admins = await getAppAdmins(appId, {
      projection: { 'emails.address': 1 },
      includeSuperAdmins: true,
    });
    const emails = admins
      .map((admin) => objGet(admin, 'emails.0.address'))
      .filter((x) => x);
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
