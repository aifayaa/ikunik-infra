import emailTemplates from './emailTemplates';

export const generateEmailHTML = ({ name, data, html }, contact) => {
  if (html) return html;
  const { template = null } = emailTemplates.find((emailTemplate) => emailTemplate.name === name);
  if (template) {
    return template(data, contact);
  }
  return null;
};
