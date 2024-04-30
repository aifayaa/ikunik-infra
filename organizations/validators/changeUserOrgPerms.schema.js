// eslint-disable-next-line import/no-extraneous-dependencies
import { z } from 'zod';

export const changeUserOrgPermsSchema = z
  .object({
    roles: z.array(z.enum(['owner', 'admin', 'member'])),
  })
  // Every field are required: 'roles'
  .required();
