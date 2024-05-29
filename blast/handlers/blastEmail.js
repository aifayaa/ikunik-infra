/* eslint-disable import/no-relative-packages */
import queue from 'async/queue';
import blastEmail from '../lib/blastEmail';
import getBalanceForBlast from '../lib/getBalanceForBlast';
import logBlast from '../lib/logBlast';
import removeBlastToken from '../lib/removeBlastToken';
import getBuilds from '../../apps/lib/getAppBuilds';
import response from '../../libs/httpResponses/response.ts';

// To avoid getting a warning with lint
const jsConsole = console;

export default async ({ contacts, subject, template, opts = {} }) => {
  const { profileId, appId } = opts;
  try {
    if (profileId) {
      const res = await getBalanceForBlast(profileId, 'email', appId);
      if (res.email < contacts.length) {
        throw new Error('insufficient tokens');
      }
    }

    jsConsole.info(contacts, subject, template);
    const sendEmails = queue(blastEmail, 20);
    const results = [];
    let successfulBlast = 0;

    const app = await getBuilds(appId);
    contacts.forEach((contact) => {
      sendEmails.push({ contact, template, subject, app }, (error, res) => {
        if (!error) successfulBlast += 1;
        results.push(error || res);
      });
    });

    await sendEmails.drain();
    await logBlast('email', subject, `${successfulBlast}`, opts);

    if (profileId) {
      await removeBlastToken('email', profileId, `${successfulBlast}`, appId);
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
