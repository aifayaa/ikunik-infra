import { UserBadgeGenericEntryEntity } from 'userBadges/lib/userBadgesEntities';

type PressCategoryActionV2Type = {
  type:
    | 'callPhoneNumber'
    | 'composeEmail'
    | 'goToTab'
    | 'openArticle'
    | 'openPdf'
    | 'openUrl';
  target: string;
};

export type PressCategoryType = {
  _id: string;
  createdAt: Date;
  appId: string;
  color: string;
  order: number;
  action_v2?: PressCategoryActionV2Type;
  action: string;
  hidden: boolean;
  isEvent: boolean;
  name: string;
  parentId: string | null;
  forcedAuthor: string | null;
  pathName: string;
  picture?: string;
  badges?: UserBadgeGenericEntryEntity;
  reversedFlow?: boolean;
  reversedFlowStart?: number;
  rssFeedUrl: string;
};
