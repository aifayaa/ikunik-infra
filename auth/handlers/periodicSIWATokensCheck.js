/* eslint-disable import/no-relative-packages */
import { periodicSIWATokensCheck } from '../lib/periodicSIWATokensCheck';
import { sendEmailTemplate } from '../../libs/email/sendEmail';
import { formatMessage, intlInit } from '../../libs/intl/intl';

const LANG = 'en';
const MAIL_TO = 'admin@crowdaa.com';

export default async () => {
  let toMail = '';

  intlInit(LANG);

  try {
    const results = await periodicSIWATokensCheck();
    if (results.length > 0) {
      const rejected = results.filter((r) => r.status === 'rejected');
      const fulfilled = results.filter((r) => r.status !== 'rejected');

      if (rejected.length > 0) {
        toMail += formatMessage('auth:siwa_periodic_renewal.title_error');
        const list = rejected
          .map((result) =>
            formatMessage('auth:siwa_periodic_renewal.list_line_error', {
              app: result.app,
              reason: result.reason,
            })
          )
          .join('</li>\n<li>');
        toMail += `<ul><li>${list}</li></ul>`;
      }
      if (fulfilled.length > 0) {
        toMail += formatMessage('auth:siwa_periodic_renewal.title_success');
        const list = fulfilled
          .map((result) =>
            formatMessage('auth:siwa_periodic_renewal.list_line_success', {
              app: result.app,
            })
          )
          .join('</li>\n<li>');
        toMail += `<ul><li>${list}</li></ul>`;
      }
    }
  } catch (e) {
    toMail = formatMessage('auth:siwa_periodic_renewal.global_error', {
      error: e,
    });
  }

  if (toMail.length > 0) {
    const subject = formatMessage('auth:siwa_periodic_renewal.title', {
      stage: process.env.STAGE,
      region: process.env.REGION,
    });
    const html = formatMessage('auth:siwa_periodic_renewal.html', {
      mailContent: toMail,
    });

    /* Let it fail, what else could we do anyway? */
    await sendEmailTemplate(LANG, 'internal', MAIL_TO, subject, html);
  }
};
