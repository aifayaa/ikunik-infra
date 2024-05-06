// eslint-disable-next-line import/no-extraneous-dependencies
import { z } from 'zod';

export const modifyAppSchema = z
  .object({
    name: z
      .string({
        required_error: 'name is required',
        invalid_type_error: 'name must be a string',
      })
      .trim()
      .optional(),
    androidName: z
      .string({ invalid_type_error: 'name must be a string' })
      .trim()
      .optional(),
    iosName: z
      .string({ invalid_type_error: 'name must be a string' })
      .trim()
      .optional(),
  })
  // Every field are required: 'name'
  .required()
  // do not allow unrecognized keys (the ones that are not defined by the object above)
  .strict();
