import { UserProfileType } from '@users/lib/userEntity';

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
  status: 'pending' | 'accepted' | 'rejected';
};

export type ChatUserType = {
  updatedAt: Date;
  profile: UserProfileType;
};

export const firebaseCollections = {
  COLL_USERS: 'users',
  COLL_CHANNELS: 'channels',
  COLL_INVITATIONS: 'invitations',
};
