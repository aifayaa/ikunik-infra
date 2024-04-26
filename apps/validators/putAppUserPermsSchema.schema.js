// eslint-disable-next-line import/no-extraneous-dependencies
import { z } from 'zod';

export const putAppUserPermsSchema = z
  .object({
    roles: z.array(z.enum(['admin', 'editor', 'moderator', 'viewer'])),
    userId: z
      .string({
        required_error: 'userId is required',
        invalid_type_error: 'userId must be a string',
      })
      .trim(),
  })
  // Every field are required: 'roles'
  .required();
