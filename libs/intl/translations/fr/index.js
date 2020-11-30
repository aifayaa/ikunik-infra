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
    app_preview_email_title: 'Prévisualisation de {{appName}}',
    app_preview_sms: 'Salut! Voila le lien pour tester votre application {{sanatizedAppName}} : {{url}}, bonne découverte!',
  },
  auth: {
    address_confirmation_email_html: addressConfirmationEmailHtml,
    address_confirmation_email_title: 'Confirmation d\'adresse email',
    forgot_password_email_html: forgotPasswordEmailHtml,
    forgot_password_email_title: 'Mot de passe oublié',
    password_reset_email_html: passwordResetEmailHtml,
    password_reset_email_title: 'Mot de passe changé',
  },
  ugc: {
    edition_type_edited: 'édité',
    edition_type_posted: 'posté',
    new_ugc_content_email_html: newUgcContentEmailHtml,
    new_ugc_content_email_title: 'Un nouveau contenu utilisateur a été {{editionType}} sur l\'app {{appName}}',
    reported_ugc_content_email_html: reportedUgcContentEmailHtml,
    reported_ugc_content_email_title: 'Un utilisateur a reporté un contenu utilisateur sur l\'app {{appName}}',
  },
};
