import { UserBadgeGenericEntryEntity } from 'userBadges/lib/userBadgesEntities';

export type ForumCategoryType = {
  _id: string;
  appId: string;
  createdAt: Date;
  createdBy: string;
  name: string;
  description: string;
  stats: {
    topicsCount: number;
  };
  icon?: string;

  badges: UserBadgeGenericEntryEntity;
};

export type ForumTopicType = {
  _id: string;
  appId: string;
  categoryId: string;
  createdAt: Date;
  createdBy: string;
  title: string;
  content: string;
  solved: boolean;
  solutionReplyId: string | null;

  lastMessageAt?: Date;
  lastMessageBy?: string;

  stats: {
    repliesCount: number;
    viewsCount: number;
    likesCount: number;
  };

  badges: UserBadgeGenericEntryEntity;
};

export type ForumTopicReplyType = {
  _id: string;
  appId: string;
  categoryId: string;
  topicId: string;
  createdAt: Date;
  createdBy: string;
  content: string;

  stats: {
    likesCount: number;
  };
};
