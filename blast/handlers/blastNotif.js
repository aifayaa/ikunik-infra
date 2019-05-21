import queue from 'async/queue';
import winston from 'winston';
import blastNotif from '../lib/blastNotif';
import getBalanceForBlast from '../lib/getBalanceForBlast';
import logBlast from '../lib/logBlast';
import removeBlastToken from '../lib/removeBlastToken';
import response from '../../libs/httpResponses/response';

export default async ({ artistName, endpoints, message, opts = {} }) => {
  const { userId, appId } = opts;
  try {
    if (userId) {
      const res = await getBalanceForBlast(userId, 'notification', appId);
      if (res.notification < endpoints.length) {
        throw new Error('insufficient tokens');
      }
    }
    winston.info(artistName, endpoints, message);
    const sendNotifications = queue(blastNotif, 50);
    const results = [];
    let successfulBlast = 0;
    const sendNotificationsDone = new Promise((resolve, reject) => {
      sendNotifications.drain = () => {
        logBlast('notification', message, `${successfulBlast}`, opts)
          .then((res) => {
            if (userId) {
              const { profileId } = res;
              return removeBlastToken('notification', profileId, `${successfulBlast}`, appId);
            }
            return null;
          })
          .then(() => {
            resolve(response({ code: 200, body: results }));
          })
          .catch((e) => {
            reject(e);
          });
      };
    });

    endpoints.forEach((endpoint) => {
      sendNotifications.push({ artistName, endpoint, message }, (error, res) => {
        if (!error) successfulBlast += 1;
        results.push(error || res);
      });
    });
    return await sendNotificationsDone;
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
