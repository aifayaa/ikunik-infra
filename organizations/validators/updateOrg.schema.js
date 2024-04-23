// eslint-disable-next-line import/no-extraneous-dependencies
import { z } from 'zod';

export const UpdateOrgSchema = z
  .object({
    name: z
      .string({
        required_error: 'name is required',
        invalid_type_error: 'name must be a string',
      })
      .max(80, { message: 'Must be 80 or fewer characters long' })
      .trim(),
    // TODO: define a regex to restrict characters ?
  })
  // do not allow unrecognized keys (the ones that are not defined by the object above)
  .strict();
