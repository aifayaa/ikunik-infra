import addressConfirmationEmailHtml from './addressConfirmationEmailHtml';
import forgotPasswordEmailHtml from './forgotPasswordEmailHtml';
import passwordResetEmailHtml from './passwordResetEmailHtml';
import passwordChangedEmailHtml from './passwordChangedEmailHtml';
import appPreviewEmailHtml from './appPreviewEmailHtml';
import newUgcArticleEmailHtml from './newUgcArticleEmailHtml';
import newUgcCommentEmailHtml from './newUgcCommentEmailHtml';
import reportedUgcArticleEmailHtml from './reportedUgcArticleEmailHtml';
import reportedUgcCommentEmailHtml from './reportedUgcCommentEmailHtml';
import emailTemplateClients from './emailTemplateClients';
import emailTemplateCustomers from './emailTemplateCustomers';
import emailTemplateInternal from './emailTemplateInternal';
import emailTemplateSkeleton from './emailTemplateSkeleton';
import ugcDataArticleEmailHtml from './ugcDataArticleEmailHtml';
import ugcDataCommentEmailHtml from './ugcDataCommentEmailHtml';
import liveStreamScheduleError from './liveStreamScheduleError';
import liveStreamScheduleSuccess from './liveStreamScheduleSuccess';
import liveStreamStartError from './liveStreamStartError';
import liveStreamStartSuccess from './liveStreamStartSuccess';
import liveStreamEndError from './liveStreamEndError';
import liveStreamCountDown from './liveStreamCountDown';

export default {
  libsEmail: {
    template_clients: emailTemplateClients,
    template_customers: emailTemplateCustomers,
    template_internal: emailTemplateInternal,
    template_skeleton: emailTemplateSkeleton,
  },
  general: {
    the_date_at_time: 'le {{dd}}/{{mm}}/{{yyyy}} à {{HH}}:{{MM}}',
  },
  apps: {
    app_preview_email: {
      html: appPreviewEmailHtml,
      title: 'Prévisualisation de {{- appName}}',
    },
    app_preview_sms: 'Salut! Voila le lien pour tester votre application {{- sanatizedAppName}} : {{- url}}, bonne découverte!',
  },
  auth: {
    address_confirmation_email: {
      html: addressConfirmationEmailHtml,
      title: 'Confirmation d\'adresse email',
    },
    forgot_password_email: {
      html: forgotPasswordEmailHtml,
      title: 'Mot de passe oublié',
    },
    password_reset_email: {
      html: passwordResetEmailHtml,
      title: 'Mot de passe changé',
    },
    password_changed_email: {
      html: passwordChangedEmailHtml,
      title: 'Mot de passe changé',
    },
  },
  ugc: {
    edition_type_edited: 'édité',
    edition_type_posted: 'posté',
    media_type_picture: 'Image',
    media_type_video: 'Vidéo',
    new_ugc_article_email: {
      html: newUgcArticleEmailHtml,
      title: '[{{- appName}}] Un nouvel article utilisateur a été {{editionType}} avec le titre {{- ugc.data.title}}',
    },
    new_ugc_comment_email: {
      html: newUgcCommentEmailHtml,
      title: '[{{- appName}}] Un nouveau commentaire utilisateur a été {{editionType}} sur l\'article {{- ugc.rootParent.title}}',
    },
    reported_ugc_article_email: {
      html: reportedUgcArticleEmailHtml,
      title: '[{{- appName}}] Un utilisateur a reporté un article nommé {{- ugc.data.title}}',
    },
    reported_ugc_comment_email: {
      html: reportedUgcCommentEmailHtml,
      title: '[{{- appName}}] Un utilisateur a reporté un commentaire sur l\'article {{- ugc.rootParent.title}}',
    },
    ugc_user_data_email: {
      article: ugcDataArticleEmailHtml,
      comment: ugcDataCommentEmailHtml,
    },
  },
  liveStream: {
    countdown_html_page: liveStreamCountDown,
    end_error: {
      title: '[{{- appName}}] Erreur d\'arret automatique de la diffusion {{- liveStreamName}}',
      html: liveStreamEndError,
    },
    schedule_error: {
      title: '[{{- appName}}] Erreur lors de la planification du lancement automatique de la diffusion {{- liveStreamName}}',
      html: liveStreamScheduleError,
    },
    schedule_success: {
      title: '[{{- appName}}] Planification du lancement automatique de la diffusion {{- liveStreamName}}',
      html: liveStreamScheduleSuccess,
    },
    start_error: {
      title: '[{{- appName}}] Erreur de lancement automatique de la diffusion {{- liveStreamName}}',
      html: liveStreamStartError,
    },
    start_success: {
      title: '[{{- appName}}] Lancement automatique de la diffusion {{- liveStreamName}}',
      html: liveStreamStartSuccess,
    },
  },
};
