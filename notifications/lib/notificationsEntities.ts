export type NotificationTypeType =
  | 'appLiveStreamStart'
  | 'chatInvitation'
  | 'chatMessage'
  | 'crowdMassNotify'
  | 'ghantyMyFid'
  | 'pressArticle'
  | 'ugcModeration'
  | 'userArticle'
  | 'userArticleAuto'
  | 'usersDirectPush';

export type CommonNotificationAwsType =
  | {
      sent: false;
      deleted: boolean;
    }
  | {
      sent: true;
      MessageId: string;
    };

export type CommonNotificationType = {
  _id: string;
  blastQueueId: string;
  appId: string;
  sentAt: Date;
  type: NotificationTypeType;

  clicked: boolean;
  clickedAt: null | Date;

  aws: CommonNotificationAwsType;

  title?: string;
  content?: string;
  extraData?: {
    articleId?: string;
    userArticleId?: string;
    liveStreamId?: string;
    webviewUrl?: string;
    fidOpenProposals?: boolean;

    channelId?: string;
    isMessage?: boolean;
    isInvitation?: boolean;
  };
};

export type UserNotificationType = CommonNotificationType & {
  target: 'user';

  userId: string;

  clickedOn: Array<string>;
  sentTo: Array<string>;
};

export type DeviceNotificationType = CommonNotificationType & {
  target: 'device';

  success: boolean;
  userId: null | string;
  deviceId: string;
};

export type NotificationType = UserNotificationType | DeviceNotificationType;
