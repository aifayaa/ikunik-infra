import queue from 'async/queue';
import winston from 'winston';
import blastNotif from '../lib/blastNotif';
import getBalanceForBlast from '../lib/getBalanceForBlast';
import logBlast from '../lib/logBlast';
import removeBlastToken from '../lib/removeBlastToken';
import response from '../../libs/httpResponses/response';

export default async ({ artistName, endpoints, message, opts = {} }) => {
  const { profileId, appId } = opts;
  try {
    if (profileId) {
      const res = await getBalanceForBlast(profileId, 'notification', appId);
      if (res.notification < endpoints.length) {
        throw new Error('insufficient tokens');
      }
    }

    winston.info(artistName, endpoints, message);
    const sendNotifications = queue(blastNotif, 50);
    const results = [];
    let successfulBlast = 0;

    endpoints.forEach((endpoint) => {
      sendNotifications.push({ artistName, endpoint, message }, (error, res) => {
        if (!error) successfulBlast += 1;
        results.push(error || res);
      });
    });

    await sendNotifications.drain();
    await logBlast('notification', message, `${successfulBlast}`, opts);
    if (profileId) {
      await removeBlastToken('notification', profileId, `${successfulBlast}`, appId);
    }

    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
