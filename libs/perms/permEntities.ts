export type AppsPermType =
  | 'owner'
  | 'admin'
  | 'editor'
  | 'moderator'
  | 'viewer';

export type AppsPermWithoutOwnerType = Omit<AppsPermType, 'owner'>;

export type OrganizationPermType = 'owner' | 'admin' | 'member';
