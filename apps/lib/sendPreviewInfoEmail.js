import getAppInfos from './getAppInfos';
import { sendEmailTemplate } from '../../libs/email/sendEmail';
import { formatMessage, intlInit } from '../../libs/intl/intl';

export const sendPreviewInfoEmail = async (appId, email, lang) => {
  const { key, name = 'Crowdaa', protocol } = await getAppInfos(appId);
  const sanatizedAppName = name.charAt(0).toUpperCase() + name.slice(1);

  intlInit(lang);

  /* Prepare data for email */
  const subject = formatMessage('apps:app_preview_email_title', { appName: sanatizedAppName });
  const url = `${protocol}://appPreview/${key}`;

  /* send token by email to user */
  const html = formatMessage('apps:app_preview_email_html', { appName: sanatizedAppName, url });

  return sendEmailTemplate(lang, 'clients', email, subject, html);
};
