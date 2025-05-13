/* eslint-disable import/no-relative-packages */
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
import siwaPeriodicRenewalHtml from './siwaPeriodicRenewalHtml';
import ugcDataArticleEmailHtml from './ugcDataArticleEmailHtml';
import ugcDataCommentEmailHtml from './ugcDataCommentEmailHtml';
import updatedAppSettingsHtml from './updatedAppSettingsHtml';
import requestedResourceUploadUrlHtml from './requestedResourceUploadUrlHtml';
import userBadgeRequestHtml from './userBadgeRequestHtml';
import userBadgeRequestRejectedHtml from './userBadgeRequestRejectedHtml';
import userBadgeRequestValidatedHtml from './userBadgeRequestValidatedHtml';
import usersFinalizedProfileHtml from './usersFinalizedProfileHtml';

export default {
  libsEmail: {
    template_clients: emailTemplateClients,
    template_customers: emailTemplateCustomers,
    template_internal: emailTemplateInternal,
    template_skeleton: emailTemplateSkeleton,
  },
  general: {
    the_date_at_time: 'the {{dd}}/{{mm}}/{{yyyy}} at {{HH}}:{{MM}}',
    var: '{{var}}',
    dayAndMonth: {
      0: '{{- day}} January',
      1: '{{- day}} February',
      2: '{{- day}} March',
      3: '{{- day}} April',
      4: '{{- day}} May',
      5: '{{- day}} June',
      6: '{{- day}} July',
      7: '{{- day}} August',
      8: '{{- day}} September',
      9: '{{- day}} October',
      10: '{{- day}} November',
      11: '{{- day}} December',
    },
    dayOfMonth: {
      1: '1st',
      2: '2nd',
      3: '3rd',
      4: '4th',
      5: '5th',
      6: '6th',
      7: '7th',
      8: '8th',
      9: '9th',
      10: '10th',
      11: '11th',
      12: '12th',
      13: '13th',
      14: '14th',
      15: '15th',
      16: '16th',
      17: '17th',
      18: '18th',
      19: '19th',
      20: '20th',
      21: '21st',
      22: '22nd',
      23: '23rd',
      24: '24th',
      25: '25th',
      26: '26th',
      27: '27th',
      28: '28th',
      29: '29th',
      30: '30th',
      31: '31st',
    },
    quotaExceeded: {
      activeUsers: {
        title: 'User quota exceeded for app {{appName}}',
      },
      liveStreamDuration: {
        title: 'Live streaming hours exceeded for app {{appName}}',
      },
    },
    quotaWarning: {
      activeUsers: {
        title: 'User quota close to the limit for app {{appName}}',
      },
      liveStreamDuration: {
        title: 'Live streaming hours close to the limit for app {{appName}}',
      },
    },
  },
  apps: {
    app_preview_email: {
      html: appPreviewEmailHtml,
      title: 'App {{- appName}} preview',
    },
    updated_app_settings: {
      html: updatedAppSettingsHtml,
      title: '[{{stage}}/{{region}}] App settings changed for {{- appName}}',
    },
    app_preview_sms:
      "Hey! Here's the link to test your app {{- sanatizedAppName}} : {{- url}}, enjoy it!",
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
      list_line_error:
        '<b>ID</b>: {{app._id}}<br><b>Name</b>: {{app.name}}<br><b>Reason</b>: {{reason}}',
      list_line_success: '<b>ID</b>: {{app._id}}<br><b>Name</b>: {{app.name}}',
      title: '[{{stage}}/{{region}}] SIWA periodic renewal summary',
      title_error: '<h4>Failed renewals</h4>',
      title_success: '<h4>Successful renewals</h4>',
    },
  },
  crypto: {
    metamaskSendLoginUrl: {
      html: metamaskSendLoginUrlHtml,
      title: '[{{app.name}}] Metamask linking',
    },
  },
  invitations: {
    join_organization_title:
      'Invitation to join the organization {{- organizationName}}',
    updated_join_organization_title:
      'Your invitation to join the organization {{- organizationName}} has been {{- status}}',
    status_accepted_feminine: 'accepted',
    status_declined_feminine: 'declined',
    status_canceled_feminine: 'canceled',
    status_unknown: 'unknown status',
  },
  organizations: {
    roleMember: 'member',
    roleAdmin: 'administrator',
  },
  ugc: {
    edition_type_edited: 'edited',
    edition_type_posted: 'posted',
    media_type_picture: 'Picture',
    media_type_video: 'Video',
    new_ugc_article_email: {
      html: newUgcArticleEmailHtml,
      title:
        '[{{- appName}}] A new user article has been {{editionType}} with title {{- ugc.data.title}}',
    },
    new_ugc_comment_email: {
      html: newUgcCommentEmailHtml,
      title:
        '[{{- appName}}] A new user comment has been {{editionType}} on article {{- ugc.rootParent.title}}',
    },
    reported_ugc_article_email: {
      html: reportedUgcArticleEmailHtml,
      title:
        '[{{- appName}}] A user has reported an article named {{- ugc.data.title}}',
    },
    reported_ugc_comment_email: {
      html: reportedUgcCommentEmailHtml,
      title:
        '[{{- appName}}] A user has reported a comment on article {{- ugc.rootParent.title}}',
    },
    reported_ugc_user_article_email: {
      html: reportedUgcUserArticleEmailHtml,
      title:
        '[{{- appName}}] A user has reported  an other user who wrote an article named {{- ugc.data.title}}',
    },
    reported_ugc_user_comment_email: {
      html: reportedUgcUserCommentEmailHtml,
      title:
        '[{{- appName}}] A user has reported  an other user who wrote a comment on article {{- ugc.rootParent.title}}',
    },
    ugc_user_data_email: {
      article: ugcDataArticleEmailHtml,
      comment: ugcDataCommentEmailHtml,
    },
    ugc_post_replied_push: {
      text: 'User {{- username}} commented your post',
      title: 'New comment',
    },
    ugc_comment_replied_push: {
      text: 'User {{- username}} replied to your comment',
      title: 'New response',
    },
    ugc_post_reacted_push: {
      text: 'User {{- username}} reacted to your post',
      title: 'New reaction',
    },
    ugc_comment_reacted_push: {
      text: 'User {{- username}} reacted to your comment',
      title: 'New reaction',
    },
    moderation_notification: {
      rejected: {
        ai: {
          text: '“{{- abstract}}”',
          title: 'Your publication was considered offending and rejected :',
        },
        human: {
          text: '“{{- abstract}}”',
          title: 'Your publication was rejected because : {{- reason}}',
        },
      },
      validated: {
        ai: {
          text: '“{{- abstract}}”',
          title: 'Your publication was automatically validated :',
        },
        human: {
          text: '“{{- abstract}}”',
          title: 'Your publication was validated :',
        },
      },
    },
  },
  liveStream: {
    view_stream_html_page: liveStreamView,
    view_recording_html_page: liveStreamRecordingView,
  },
  forms: {
    postFormRegisterEmail: {
      title: 'Crowdaa || Summary of your account creation',
    },
  },
  pressArticles: {
    generateContent: {
      generic: {
        title:
          'Write a short article title about the following subject : {{- userPrompt}}',
        article:
          'Write an article in Markdown with the following title : {%title%}',
        articlePicture: '{%title%}',
      },
      custom: {
        title:
          'Write a short article title about the following subject : {{- userPrompt}}',
        article:
          'Write an article in Markdown about the following subject : {{- userPrompt}}',
        articlePicture: '{{- userPrompt}}',
      },
    },
  },
  pressAutomation: {
    runTask: {
      summary: {
        globalSummary:
          'Briefly summarize these {{- count}} news titles, one per line : {{- newsTitles}}',
        singleSummary:
          'Briefly summarize this article in markdown format : {{- news}}',
        title: '{{- date}} news summary about {{- category}}',
      },
      reword: {
        title: 'Reword this news article title : {{- title}}',
        news: 'Reword this news article in markdown format : {{- news}}',
      },
    },
  },
  pressPolls: {
    export: {
      col_name: 'Username',
      col_uid: 'User ID',
      col_device: 'Device ID',
    },
  },
  userBadges: {
    user_badge_request: {
      title:
        '[{{- appName}}] User {{- username}} requested access to the permission {{- badgeName}}',
      html: userBadgeRequestHtml,
    },
    badge_request_validated: {
      title:
        '[{{- appName}}] Your permission request to {{- badgeName}} was accepted',
      html: userBadgeRequestValidatedHtml,
    },
    badge_request_rejected: {
      title:
        '[{{- appName}}] Your permission request to {{- badgeName}} was rejected',
      html: userBadgeRequestRejectedHtml,
    },
  },
  users: {
    finalized_profile: {
      title: '[{{- appName}}] The user {{- username}} finalized his profile',
      html: usersFinalizedProfileHtml,
    },
  },
  files: {
    requested_resource_upload_url: {
      html: requestedResourceUploadUrlHtml,
      title: '[{{stage}}/{{region}}] Resource upload for {{- appName}}',
    },
  },
  appLiveStreams: {
    notifications: {
      start: {
        text: '{{- userName}} just started a live stream',
        title: 'A live stream is starting',
      },
    },
  },
};
