export type AppsPermType =
  | 'owner'
  | 'admin'
  | 'editor'
  | 'moderator'
  | 'viewer';

export type AppsFeaturePermType = 'ticketingScanner';
export const appsFeaturePermsList: AppsFeaturePermType[] = ['ticketingScanner'];

export type AppsPermWithoutOwnerType = Omit<AppsPermType, 'owner'>;

export type OrganizationPermType = 'owner' | 'admin' | 'member';

// The lower ranking, the higher role privilege
export const OrganizationPermRanking: OrganizationPermType[] = [
  'owner',
  'admin',
  'member',
];
