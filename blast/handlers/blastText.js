/* eslint-disable import/no-relative-packages */
import queue from 'async/queue';
import blastText from '../lib/blastText';
import getBalanceForBlast from '../lib/getBalanceForBlast';
import logBlast from '../lib/logBlast';
import removeBlastToken from '../lib/removeBlastToken';
import response from '../../libs/httpResponses/response.ts';

// To avoid getting a warning with lint
const jsConsole = console;

export default async ({ phones, message, opts = {} }) => {
  const { profileId, appId } = opts;
  try {
    if (profileId) {
      const res = await getBalanceForBlast(profileId, 'text', appId);
      if (res.text < phones.length) {
        throw new Error('insufficient tokens');
      }
    }
    jsConsole.info(phones, message);
    const sendTexts = queue(blastText, 50);
    const results = [];
    let successfulBlast = 0;

    phones.forEach((phoneNumber) => {
      sendTexts.push({ message, phoneNumber }, (error, res) => {
        if (!error) successfulBlast += 1;
        results.push(error || res);
      });
    });

    await sendTexts.drain();
    await logBlast('text-message', message, `${successfulBlast}`, opts);

    if (profileId) {
      await removeBlastToken('text', profileId, `${successfulBlast}`, appId);
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
