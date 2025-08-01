export type GenericContentReportType = {
  _id: string;
  createdBy: string;
  createdAt: Date;

  appId: string;
  targetCollection: string;
  targetId: string;
  targetUserId: string;
  reason: string;

  context: {
    from: 'forum'; // TODO: Merge with UGC later? `'forum' | 'ugc'`

    // ugcCommentId?: string;
    // ugcPostId?: string;
    forumTopicId?: string;
    forumTopicReplyId?: string;
  };
};
