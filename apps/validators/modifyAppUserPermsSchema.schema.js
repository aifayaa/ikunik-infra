// eslint-disable-next-line import/no-extraneous-dependencies
import { z } from 'zod';

export const modifyAppUserPermsSchema = z
  .object({
    roles: z.array(
      z
        .string({
          required_error: 'roles is required',
          invalid_type_error: 'roles must be a string',
        })
        .trim()
      // TODO: define a regex to restrict characters ?
    ),
  })
  // Every field are required: 'roles'
  .required()
  // do not allow unrecognized keys (the ones that are not defined by the object above)
  .strict();
