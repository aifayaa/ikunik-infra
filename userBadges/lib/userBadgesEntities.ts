export const userBadgesManagementFieldValues = [
  'private-internal',
  'request',
  'public',
  'private-visible',
] as const;

export type UserBadgesManagementFieldType =
  typeof userBadgesManagementFieldValues;

export const userBadgesAccessFieldValues = [
  'hidden',
  'teaser',
  'preview',
  'notifications',
] as const;

export type UserBadgesAccessFieldType = typeof userBadgesAccessFieldValues;

export type UserBadgeType = {
  _id: string;
  appId: string;
  createdAt: Date;
  authorId: string;
  name: string;

  access: UserBadgesAccessFieldType;
  management: UserBadgesManagementFieldType;
  color: string;
  description: string;
  privacyPolicyUrl?: string;
  subscriptionUrl?: string;

  isDefault: boolean;
};

export type UserBadgeGenericEntryEntity = {
  list: Array<{ id: string }>;
  allow: 'all' | 'any';
};
