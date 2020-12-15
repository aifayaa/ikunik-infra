import addressConfirmationEmailHtml from './addressConfirmationEmailHtml';
import forgotPasswordEmailHtml from './forgotPasswordEmailHtml';
import passwordResetEmailHtml from './passwordResetEmailHtml';
import appPreviewEmailHtml from './appPreviewEmailHtml';
import newUgcArticleEmailHtml from './newUgcArticleEmailHtml';
import newUgcCommentEmailHtml from './newUgcCommentEmailHtml';
import reportedUgcArticleEmailHtml from './reportedUgcArticleEmailHtml';
import reportedUgcCommentEmailHtml from './reportedUgcCommentEmailHtml';
import emailTemplateClients from './emailTemplateClients';
import emailTemplateCustomers from './emailTemplateCustomers';
import emailTemplateSkeleton from './emailTemplateSkeleton';
import ugcDataArticleEmailHtml from './ugcDataArticleEmailHtml';
import ugcDataCommentEmailHtml from './ugcDataCommentEmailHtml';

export default {
  libsEmail: {
    template_clients: emailTemplateClients,
    template_customers: emailTemplateCustomers,
    template_skeleton: emailTemplateSkeleton,
  },
  apps: {
    app_preview_email: {
      html: appPreviewEmailHtml,
      title: 'App {{- appName}} preview',
    },
    app_preview_sms: 'Hey! Here\'s the link to test your app {{- sanatizedAppName}} : {{- url}}, enjoy it!',
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
    media_type_picture: 'Picture',
    media_type_video: 'Video',
    new_ugc_article_email: {
      html: newUgcArticleEmailHtml,
      title: '[{{- appName}}] A new user article has been {{editionType}} with title {{- ugc.data.title}}',
    },
    new_ugc_comment_email: {
      html: newUgcCommentEmailHtml,
      title: '[{{- appName}}] A new user comment has been {{editionType}} on article {{- ugc.rootParent.title}}',
    },
    reported_ugc_article_email: {
      html: reportedUgcArticleEmailHtml,
      title: '[{{- appName}}] A user has reported an article named {{- ugc.data.title}}',
    },
    reported_ugc_comment_email: {
      html: reportedUgcCommentEmailHtml,
      title: '[{{- appName}}] A user has reported a comment on article {{- ugc.rootParent.title}}',
    },
    ugc_user_data_email: {
      article: ugcDataArticleEmailHtml,
      comment: ugcDataCommentEmailHtml,
    },
  },
};
