import {
  AppsPermType,
  OrganizationPermType,
} from '../../libs/perms/permEntities';

export type UserType = {
  _id: string;
  superAdmin?: boolean;
  perms?: {
    apps?: Array<{ _id: string; roles: Array<AppsPermType> }>;
    organizations?: Array<{ _id: string; roles: Array<OrganizationPermType> }>;
  };
};
