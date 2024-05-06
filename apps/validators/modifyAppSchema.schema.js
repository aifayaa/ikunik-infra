// eslint-disable-next-line import/no-extraneous-dependencies
import { z } from 'zod';

export const modifyAppSchema = z
  .object({
    name: z.optional(
      z
        .string({
          required_error: 'name is required',
          invalid_type_error: 'name must be a string',
        })
        .trim()
    ),
    androidName: z.optional(
      z
        .string({ invalid_type_error: 'androidName must be a string' })
        .trim()
        .min(1, { message: 'androidName must be 1 or more characters long' })
        .max(30, { message: 'androidName must be 30 or fewer characters long' })
    ),
    iosName: z.optional(
      z
        .string({ invalid_type_error: 'iosName must be a string' })
        .trim()
        .min(1, { message: 'iosName must be 1 or more characters long' })
        .max(30, { message: 'iosName must be 30 or fewer characters long' })
    ),
  })
  // do not allow unrecognized keys (the ones that are not defined by the object above)
  .strict();
