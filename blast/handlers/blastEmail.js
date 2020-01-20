import queue from 'async/queue';
import winston from 'winston';
import blastEmail from '../lib/blastEmail';
import getBalanceForBlast from '../lib/getBalanceForBlast';
import logBlast from '../lib/logBlast';
import removeBlastToken from '../lib/removeBlastToken';
import response from '../../libs/httpResponses/response';

export default async ({
  contacts,
  subject,
  template,
  opts = {},
}) => {
  const { userId, appId } = opts;
  try {
    if (userId) {
      const res = await getBalanceForBlast(userId, 'email', appId);
      if (res.email < contacts.length) {
        throw new Error('insufficient tokens');
      }
    }

    winston.info(contacts, subject, template);
    const sendEmails = queue(blastEmail, 20);
    const results = [];
    let successfulBlast = 0;

    contacts.forEach((contact) => {
      sendEmails.push({ contact, template, subject }, (error, res) => {
        if (!error) successfulBlast += 1;
        results.push(error || res);
      });
    });

    await sendEmails.drain();
    const res = await logBlast('email', subject, `${successfulBlast}`, opts);

    if (userId) {
      const { profileId } = res;
      await removeBlastToken('email', profileId, `${successfulBlast}`, appId);
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
