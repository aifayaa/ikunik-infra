import addressConfirmationEmailHtml from './addressConfirmationEmailHtml';
import forgotPasswordEmailHtml from './forgotPasswordEmailHtml';
import passwordResetEmailHtml from './passwordResetEmailHtml';
import appPreviewEmailHtml from './appPreviewEmailHtml';
import newUgcContentEmailHtml from './newUgcContentEmailHtml';
import reportedUgcContentEmailHtml from './reportedUgcContentEmailHtml';
import emailTemplateClients from './emailTemplateClients';
import emailTemplateCustomers from './emailTemplateCustomers';
import emailTemplateSkeleton from './emailTemplateSkeleton';

export default {
  libsEmail: {
    template_clients: emailTemplateClients,
    template_customers: emailTemplateCustomers,
    template_skeleton: emailTemplateSkeleton,
  },
  apps: {
    app_preview_email: {
      html: appPreviewEmailHtml,
      title: 'App {{appName}} preview',
    },
    app_preview_sms: 'Hey! Here\'s the link to test your app {{sanatizedAppName}} : {{url}}, enjoy it!',
  },
  auth: {
    address_confirmation_email: {
      html: addressConfirmationEmailHtml,
      title: 'Email confirmation',
    },
    forgot_password_email: {
      html: forgotPasswordEmailHtml,
      title: 'Forgot Password',
    },
    password_reset_email: {
      html: passwordResetEmailHtml,
      title: 'Password has been reset',
    },
  },
  ugc: {
    edition_type_edited: 'edited',
    edition_type_posted: 'posted',
    new_ugc_content_email: {
      html: newUgcContentEmailHtml,
      title: 'A new UGC has been {{editionType}} on app {{appName}}',
    },
    reported_ugc_content_email: {
      html: reportedUgcContentEmailHtml,
      title: 'A User has report an UGC on app {{appName}}',
    },
  },
};
