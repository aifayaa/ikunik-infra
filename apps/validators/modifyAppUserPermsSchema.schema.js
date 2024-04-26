// eslint-disable-next-line import/no-extraneous-dependencies
import { z } from 'zod';

export const modifyAppUserPermsSchema = z
  .object({
    roles: z.array(z.enum(['admin', 'editor', 'moderator', 'viewer'])),
  })
  // Every field are required: 'roles'
  .required();
