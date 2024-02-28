/* eslint-disable import/no-relative-packages */
import emailTemplates from './emailTemplates';

export const generateEmailHTML = ({ name, data, html }, contact, app) => {
  if (html) return html;
  const { template = null } = emailTemplates.find(
    (emailTemplate) => emailTemplate.name === name
  );
  if (template) {
    return template(data, contact, app);
  }
  return null;
};
