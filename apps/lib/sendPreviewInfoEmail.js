import getAppInfos from './getAppInfos';
import { appPreviewEmailHTML } from './appPreviewEmailHTML';
import { sendEmail } from '../../libs/email/sendEmail';

export const sendPreviewInfoEmail = async (appId, email) => {
  const { key, name = 'Crowdaa', protocol } = await getAppInfos(appId);
  const sanatizedAppName = name.charAt(0).toUpperCase() + name.slice(1);

  /* Prepare data for email */
  const subject = `App ${sanatizedAppName} preview`;
  const url = `${protocol}://appPreview/${key}`;

  /* send token by email to user */
  const html = appPreviewEmailHTML(sanatizedAppName, url);

  return sendEmail(subject, html, email);
};
