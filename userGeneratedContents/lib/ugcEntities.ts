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

export type UGCType = {
  _id: string;
  appId: string;
  type: 'comment' | 'article';
  userId: string;

  parentId: string | null;
  parentCollection: '' | 'userGeneratedContents' | 'pressArticles';
  rootParentId: string | null;
  rootParentCollection: '' | 'userGeneratedContents' | 'pressArticles';

  data:
    | string
    | {
        content: string;
        title: string;
        pictures: string[];
        videos: string[];
      };
  lang?: string;

  offensive?: UGCOffensiveFieldType;
  reviewed?: boolean;
  moderated?: boolean;
  reason: string;

  trashed: boolean;

  createdAt: Date;
  modifiedAt: false | Date;
  removedAt: Date;
  removedBy: string;
};

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
