import addressConfirmationEmailHtml from './addressConfirmationEmailHtml';
import forgotPasswordEmailHtml from './forgotPasswordEmailHtml';
import passwordResetEmailHtml from './passwordResetEmailHtml';
import appPreviewEmailHtml from './appPreviewEmailHtml';
import newUgcContentEmailHtml from './newUgcContentEmailHtml';
import reportedUgcContentEmailHtml from './reportedUgcContentEmailHtml';
import emailTemplateClients from './emailTemplateClients';
import emailTemplateCustomers from './emailTemplateCustomers';

export default {
  libsEmail: {
    template_clients: emailTemplateClients,
    template_customers: emailTemplateCustomers,
  },
  apps: {
    app_preview_email_html: appPreviewEmailHtml,
    app_preview_email_title: 'App {{appName}} preview',
    app_preview_sms: 'Hey! Here\'s the link to test your app {{sanatizedAppName}} : {{url}}, enjoy it!',
  },
  auth: {
    address_confirmation_email_html: addressConfirmationEmailHtml,
    address_confirmation_email_title: 'Email confirmation',
    forgot_password_email_html: forgotPasswordEmailHtml,
    forgot_password_email_title: 'Forgot Password',
    password_reset_email_html: passwordResetEmailHtml,
    password_reset_email_title: 'Password has been reset',
  },
  ugc: {
    edition_type_edited: 'edited',
    edition_type_posted: 'posted',
    new_ugc_content_email_html: newUgcContentEmailHtml,
    new_ugc_content_email_title: 'A new UGC has been {{editionType}} on app {{appName}}',
    reported_ugc_content_email_html: reportedUgcContentEmailHtml,
    reported_ugc_content_email_title: 'A User has report an UGC on app {{appName}}',
  },
};
