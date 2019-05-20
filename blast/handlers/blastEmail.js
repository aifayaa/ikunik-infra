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
}, _context, callback) => {
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
    const sendEmailDone = new Promise((resolve) => {
      sendEmails.drain = () => {
        logBlast('email', subject, `${successfulBlast}`, opts)
          .then((res) => {
            if (userId) {
              const { profileId } = res;
              return removeBlastToken('email', profileId, `${successfulBlast}`, appId);
            }
            return null;
          })
          .then(() => {
            resolve();
            callback(null, response({ code: 200, body: results }));
          })
          .catch((e) => {
            resolve();
            callback(null, response({ code: 500, message: e.message }));
          });
      };
    });

    contacts.forEach((contact) => {
      sendEmails.push({ contact, template, subject }, (error, res) => {
        if (!error) successfulBlast += 1;
        results.push(error || res);
      });
    });
    await sendEmailDone; // FIX: avoid End of lambda before queue drained
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
