import { UserProfileType } from '@users/lib/userEntity';

export type ChatInvitationStatusType =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'disabled';

export type ChatInvitationType = {
  fromUser: {
    id: string;
    profile: UserProfileType;
  };
  toUser: {
    id: string;
    profile: UserProfileType;
  };
  channel: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
  status: ChatInvitationStatusType;
};

export type ChatUserType = {
  updatedAt: Date;
  profile: UserProfileType;
};

type ChatChannelCommonType = {
  createdAt: Date;
  ownerId: string;
  description: string;
  isDeleted: boolean;
  isPublic: boolean;
  bannedUsers: Array<string>;
  name: string;
};

type ChatChannelPrivateType = ChatChannelCommonType & {
  members: Array<string>;
  isPublic: false;
};

type ChatChannelPublicType = ChatChannelCommonType & {
  isPublic: true;
  // This still contains a `members` array, but it is not used, and should be
};

export type ChatChannelType = ChatChannelPrivateType | ChatChannelPublicType;

export const firebaseCollections = {
  COLL_USERS: 'users',
  COLL_CHANNELS: 'channels',
  COLL_INVITATIONS: 'invitations',
};
