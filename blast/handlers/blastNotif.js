import queue from 'async/queue';
import blastNotif from '../lib/blastNotif';
import getBalanceForBlast from '../lib/getBalanceForBlast';
import logBlast from '../lib/logBlast';
import removeBlastToken from '../lib/removeBlastToken';
import response from '../../libs/httpResponses/response';

// To avoid getting a warning with lint
const jsConsole = console;

export default async ({ title, endpoints, message, opts = {} }) => {
  const { profileId, appId } = opts;
  try {
    if (profileId) {
      const res = await getBalanceForBlast(profileId, 'notification', appId);
      if (res.notification < endpoints.length) {
        throw new Error('insufficient tokens');
      }
    }

    jsConsole.info(title, endpoints, message);
    const sendNotifications = queue(blastNotif, 50);
    const results = [];
    let successfulBlast = 0;

    endpoints.forEach((endpoint) => {
      sendNotifications.push({ title, endpoint, message }, (error, res) => {
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
