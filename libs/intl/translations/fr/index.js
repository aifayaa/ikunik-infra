import addressConfirmationEmailHtml from './addressConfirmationEmailHtml';
import appPreviewEmailHtml from './appPreviewEmailHtml';
import emailTemplateClients from './emailTemplateClients';
import emailTemplateCustomers from './emailTemplateCustomers';
import emailTemplateInternal from './emailTemplateInternal';
import emailTemplateSkeleton from './emailTemplateSkeleton';
import forgotPasswordEmailHtml from './forgotPasswordEmailHtml';
import liveStreamRecordingView from './liveStreamRecordingView';
import liveStreamView from './liveStreamView';
import metamaskSendLoginUrlHtml from './metamaskSendLoginUrlHtml';
import newUgcArticleEmailHtml from './newUgcArticleEmailHtml';
import newUgcCommentEmailHtml from './newUgcCommentEmailHtml';
import passwordChangedEmailHtml from './passwordChangedEmailHtml';
import passwordResetEmailHtml from './passwordResetEmailHtml';
import reportedUgcArticleEmailHtml from './reportedUgcArticleEmailHtml';
import reportedUgcCommentEmailHtml from './reportedUgcCommentEmailHtml';
import reportedUgcUserArticleEmailHtml from './reportedUgcUserArticleEmailHtml';
import reportedUgcUserCommentEmailHtml from './reportedUgcUserCommentEmailHtml';
import ugcDataArticleEmailHtml from './ugcDataArticleEmailHtml';
import ugcDataCommentEmailHtml from './ugcDataCommentEmailHtml';
import userBadgeRequestHtml from './userBadgeRequestHtml';
import usersFinalizedProfileHtml from './usersFinalizedProfileHtml';

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
    invite_app_admin_email_title: 'Crowdaa || Votre tableau de bord {{- appName}}',
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
  crypto: {
    metamaskSendLoginUrl: {
      html: metamaskSendLoginUrlHtml,
      title: '[{{app.name}}] Liaison à Metamask',
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
    reported_ugc_user_article_email: {
      html: reportedUgcUserArticleEmailHtml,
      title: '[{{- appName}}] Un utilisateur a reporté un autre utilisateur sur un article nommé {{- ugc.data.title}}',
    },
    reported_ugc_user_comment_email: {
      html: reportedUgcUserCommentEmailHtml,
      title: '[{{- appName}}] Un utilisateur a reporté un autre utilisateur sur un commentaire sur l\'article {{- ugc.rootParent.title}}',
    },
    ugc_user_data_email: {
      article: ugcDataArticleEmailHtml,
      comment: ugcDataCommentEmailHtml,
    },
  },
  liveStream: {
    view_stream_html_page: liveStreamView,
    view_recording_html_page: liveStreamRecordingView,
  },
  forms: {
    postFormRegisterEmail: {
      title: 'Crowdaa || Récapitulatif de votre création de compte',
    },
  },
  pressArticles: {
    generateContent: {
      generic: {
        title: 'Écris un titre d\'article court sur le sujet suivant : {{- userPrompt}}',
        article: 'Écris un article en markdown dont le titre est : {%title%}',
        articlePicture: '{%title%}',
      },
      custom: {
        title: 'Écris un titre d\'article court sur le sujet suivant : {{- userPrompt}}',
        article: 'Écris un article en markdown sur le sujet suivant : {{- userPrompt}}',
        articlePicture: '{{- userPrompt}}',
      },
    },
  },
  userBadges: {
    user_badge_request: {
      title: '[{{- appName}}] L\'utilisateur {{- username}} a demandé l\'accès au badge {{- badgeName}}',
      html: userBadgeRequestHtml,
    },
  },
  users: {
    finalized_profile: {
      title: '[{{- appName}}] L\'utilisateur {{- username}} a finalisé son inscription',
      html: usersFinalizedProfileHtml,
    },
  },
};
