export type UGCOffensiveFieldType = {
  status: 'offensive' | 'inoffensive' | 'checking' | 'unchecked';
  title: boolean;
  content: boolean;
  picturesIds: Array<string>;
  videosIds: Array<string>;
  videoProcessing: Array<{
    videoId: string;
    jobId: string;
  }>;
};

type UGCCommonType = {
  _id: string;
  appId: string;
  userId: string;

  parentId: string | null;
  parentCollection: '' | 'userGeneratedContents' | 'pressArticles';
  rootParentId: string | null;
  rootParentCollection: '' | 'userGeneratedContents' | 'pressArticles';

  lang?: string;

  offensive?: UGCOffensiveFieldType;
  reviewed?: boolean;
  moderated?: boolean;
  reason: string;

  trashed: boolean;

  createdAt: Date;
  modifiedAt: false | Date;
  removedAt?: Date;
  removedBy?: string;
};

export type UGCArticleType = UGCCommonType & {
  type: 'article';
  data: {
    content: string;
    title: string;
    pictures: string[];
    videos: string[];
  };
};

export type UGCCommentType = UGCCommonType & {
  type: 'comment';
  data: string;
};

export type UGCType = UGCArticleType | UGCCommentType;

export type UGCModerationNotificationDataType = {
  appId: string;
  notifyAt: Date;
  type: 'ugcModeration';
  data: {
    ugcId: string;
    abstract: string;
    validated: boolean;
    human: boolean;
    reason: string;
  };
};
