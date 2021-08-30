import addressConfirmationEmailHtml from './addressConfirmationEmailHtml';
import forgotPasswordEmailHtml from './forgotPasswordEmailHtml';
import passwordResetEmailHtml from './passwordResetEmailHtml';
import passwordChangedEmailHtml from './passwordChangedEmailHtml';
import siwaPeriodicRenewalHtml from './siwaPeriodicRenewalHtml';
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
import liveStreamView from './liveStreamView';
import liveStreamRecordingView from './liveStreamRecordingView';

export default {
  libsEmail: {
    template_clients: emailTemplateClients,
    template_customers: emailTemplateCustomers,
    template_internal: emailTemplateInternal,
    template_skeleton: emailTemplateSkeleton,
  },
  general: {
    the_date_at_time: 'the {{dd}}/{{mm}}/{{yyyy}} at {{HH}}:{{MM}}',
  },
  apps: {
    app_preview_email: {
      html: appPreviewEmailHtml,
      title: 'App {{- appName}} preview',
    },
    app_preview_sms: 'Hey! Here\'s the link to test your app {{- sanatizedAppName}} : {{- url}}, enjoy it!',
    invite_app_admin_email_title: 'Crowdaa || Your dashboard {{- appName}}',
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
    password_changed_email: {
      html: passwordChangedEmailHtml,
      title: 'Password has been reset',
    },
    /* This block is defined in english only for now, since we have no use for an other language. */
    siwa_periodic_renewal: {
      global_error: 'Error during general Apple SIWA token renewal : {{error}}',
      html: siwaPeriodicRenewalHtml,
      list_line_error: '<b>ID</b>: {{app._id}}<br><b>Name</b>: {{app.name}}<br><b>Reason</b>: {{reason}}',
      list_line_success: '<b>ID</b>: {{app._id}}<br><b>Name</b>: {{app.name}}',
      title: '[{{stage}}] SIWA periodic renewal summary',
      title_error: '<h4>Failed renewals</h4>',
      title_success: '<h4>Successful renewals</h4>',
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
  liveStream: {
    view_stream_html_page: liveStreamView,
    view_recording_html_page: liveStreamRecordingView,
  },
};
