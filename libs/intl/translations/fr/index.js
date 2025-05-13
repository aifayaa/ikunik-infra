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
import ugcDataArticleEmailHtml from './ugcDataArticleEmailHtml';
import ugcDataCommentEmailHtml from './ugcDataCommentEmailHtml';
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
    the_date_at_time: 'le {{dd}}/{{mm}}/{{yyyy}} à {{HH}}:{{MM}}',
    var: '{{var}}',
    dayAndMonth: {
      0: '{{- day}} Janvier',
      1: '{{- day}} Février',
      2: '{{- day}} Mars',
      3: '{{- day}} Avril',
      4: '{{- day}} Mai',
      5: '{{- day}} Juin',
      6: '{{- day}} Juillet',
      7: '{{- day}} Août',
      8: '{{- day}} Septembre',
      9: '{{- day}} Octobre',
      10: '{{- day}} Novembre',
      11: '{{- day}} Décembre',
    },
    dayOfMonth: {
      1: '1er',
      2: '2',
      3: '3',
      4: '4',
      5: '5',
      6: '6',
      7: '7',
      8: '8',
      9: '9',
      10: '10',
      11: '11',
      12: '12',
      13: '13',
      14: '14',
      15: '15',
      16: '16',
      17: '17',
      18: '18',
      19: '19',
      20: '20',
      21: '21',
      22: '22',
      23: '23',
      24: '24',
      25: '25',
      26: '26',
      27: '27',
      28: '28',
      29: '29',
      30: '30',
      31: '31',
    },
    quotaExceeded: {
      activeUsers: {
        title: "Quota d'utilisateurs dépassé pour l'app {{appName}}",
      },
      liveStreamDuration: {
        title: "Quota d'heures streamées dépassé pour l'app {{appName}}",
      },
    },
    quotaWarning: {
      activeUsers: {
        title:
          "Quota d'utilisateurs proche de la limite pour l'app {{appName}}",
      },
      liveStreamDuration: {
        title:
          "Quota d'heures streamées proche de la limite pour l'app {{appName}}",
      },
    },
  },
  apps: {
    app_preview_email: {
      html: appPreviewEmailHtml,
      title: 'Prévisualisation de {{- appName}}',
    },
    app_preview_sms:
      'Salut! Voila le lien pour tester votre application {{- sanatizedAppName}} : {{- url}}, bonne découverte!',
    invite_app_admin_email_title:
      'Crowdaa || Votre tableau de bord {{- appName}}',
  },
  auth: {
    address_confirmation_email: {
      html: addressConfirmationEmailHtml,
      title: "Confirmation d'adresse email",
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
  invitations: {
    join_organization_title:
      "Invitation à rejoindre l'organisation {{- organizationName}}",
    updated_join_organization_title:
      "Votre invitation à rejoindre l'organisation {{- organizationName}} a été {{- status}}",
    status_accepted_feminine: 'acceptée',
    status_declined_feminine: 'déclinée',
    status_canceled_feminine: 'annulée',
    status_unknown: 'statut inconnu',
  },
  organizations: {
    roleMember: 'membre',
    roleAdmin: 'administrateur',
  },
  ugc: {
    edition_type_edited: 'édité',
    edition_type_posted: 'posté',
    media_type_picture: 'Image',
    media_type_video: 'Vidéo',
    new_ugc_article_email: {
      html: newUgcArticleEmailHtml,
      title:
        '[{{- appName}}] Un nouvel article utilisateur a été {{editionType}} avec le titre {{- ugc.data.title}}',
    },
    new_ugc_comment_email: {
      html: newUgcCommentEmailHtml,
      title:
        "[{{- appName}}] Un nouveau commentaire utilisateur a été {{editionType}} sur l'article {{- ugc.rootParent.title}}",
    },
    reported_ugc_article_email: {
      html: reportedUgcArticleEmailHtml,
      title:
        '[{{- appName}}] Un utilisateur a reporté un article nommé {{- ugc.data.title}}',
    },
    reported_ugc_comment_email: {
      html: reportedUgcCommentEmailHtml,
      title:
        "[{{- appName}}] Un utilisateur a reporté un commentaire sur l'article {{- ugc.rootParent.title}}",
    },
    reported_ugc_user_article_email: {
      html: reportedUgcUserArticleEmailHtml,
      title:
        '[{{- appName}}] Un utilisateur a reporté un autre utilisateur sur un article nommé {{- ugc.data.title}}',
    },
    reported_ugc_user_comment_email: {
      html: reportedUgcUserCommentEmailHtml,
      title:
        "[{{- appName}}] Un utilisateur a reporté un autre utilisateur sur un commentaire sur l'article {{- ugc.rootParent.title}}",
    },
    ugc_user_data_email: {
      article: ugcDataArticleEmailHtml,
      comment: ugcDataCommentEmailHtml,
    },
    ugc_post_replied_push: {
      text: "L'utilisateur {{- username}} a commenté votre publication",
      title: 'Nouveau commentaire',
    },
    ugc_comment_replied_push: {
      text: "L'utilisateur {{- username}} a répondu à votre commentaire",
      title: 'Nouvelle réponse',
    },
    ugc_post_reacted_push: {
      text: "L'utilisateur {{- username}} a réagi à votre publication",
      title: 'Nouvelle réaction',
    },
    ugc_comment_reacted_push: {
      text: "L'utilisateur {{- username}} a réagi à à votre commentaire",
      title: 'Nouvelle réaction',
    },
    moderation_notification: {
      rejected: {
        ai: {
          text: '« {{- abstract}} »',
          title: 'Votre publication a été considérée offençante et rejetée :',
        },
        human: {
          text: '« {{- abstract}} »',
          title: 'Votre publication a été rejetée car : {{- reason}}',
        },
      },
      validated: {
        ai: {
          text: '« {{- abstract}} »',
          title: 'Votre publication a été validée automatiquement :',
        },
        human: {
          text: '« {{- abstract}} »',
          title: 'Votre publication a été validée :',
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
      title: 'Crowdaa || Récapitulatif de votre création de compte',
    },
  },
  pressArticles: {
    generateContent: {
      generic: {
        title:
          "Écris un titre d'article court sur le sujet suivant : {{- userPrompt}}",
        article: 'Écris un article en markdown dont le titre est : {%title%}',
        articlePicture: '{%title%}',
      },
      custom: {
        title:
          "Écris un titre d'article court sur le sujet suivant : {{- userPrompt}}",
        article:
          'Écris un article en markdown sur le sujet suivant : {{- userPrompt}}',
        articlePicture: '{{- userPrompt}}',
      },
    },
  },
  pressAutomation: {
    runTask: {
      summary: {
        globalSummary:
          "Résume brièvement ces {{- count}} titres d'actualités, une par ligne : {{- newsTitles}}",
        singleSummary:
          'Résume brièvement cet article au format markdown : {{- news}}',
        title: 'Actualités du {{- date}} dans {{- category}}',
      },
      reword: {
        title: "Reformule ce titre d'article d'actualité : {{- title}}",
        news: "Reformule cet article d'actualité au format markdown : {{- news}}",
      },
    },
  },
  pressPolls: {
    export: {
      col_name: 'Utilisateur',
      col_uid: 'ID utilisateur',
      col_device: 'ID périphérique',
    },
  },
  userBadges: {
    user_badge_request: {
      title:
        "[{{- appName}}] L'utilisateur {{- username}} a demandé l'accès à la permission {{- badgeName}}",
      html: userBadgeRequestHtml,
    },
    badge_request_validated: {
      title:
        "[{{- appName}}] Votre demande d'accès à la permission {{- badgeName}} a été acceptée",
      html: userBadgeRequestValidatedHtml,
    },
    badge_request_rejected: {
      title:
        "[{{- appName}}] Votre demande d'accès à la permission {{- badgeName}} a été refusée",
      html: userBadgeRequestRejectedHtml,
    },
  },
  users: {
    finalized_profile: {
      title:
        "[{{- appName}}] L'utilisateur {{- username}} a finalisé son inscription",
      html: usersFinalizedProfileHtml,
    },
  },
  appLiveStreams: {
    notifications: {
      start: {
        text: '{{- userName}} a commencé une diffusion en direct',
        title: 'Un direct a démarré',
      },
    },
  },
};
