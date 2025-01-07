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
    iosDescription: z.optional(
      z
        .string({ invalid_type_error: 'iosDescription must be a string' })
        .trim()
        .min(1, { message: 'iosDescription must be 1 or more characters long' })
    ),
    iosAuthor: z.optional(
      z
        .string({ invalid_type_error: 'iosAuthor must be a string' })
        .trim()
        .min(1, { message: 'iosAuthor must be 1 or more characters long' })
    ),
    iosEmail: z.optional(
      z
        .string({ invalid_type_error: 'iosEmail must be a string' })
        .trim()
        .min(1, { message: 'iosEmail must be 1 or more characters long' })
    ),
    androidDescription: z.optional(
      z
        .string({ invalid_type_error: 'androidDescription must be a string' })
        .trim()
        .min(1, {
          message: 'androidDescription must be 1 or more characters long',
        })
    ),
    androidAuthor: z.optional(
      z
        .string({ invalid_type_error: 'androidAuthor must be a string' })
        .trim()
        .min(1, { message: 'androidAuthor must be 1 or more characters long' })
    ),
    androidEmail: z.optional(
      z
        .string({ invalid_type_error: 'androidEmail must be a string' })
        .trim()
        .min(1, { message: 'androidEmail must be 1 or more characters long' })
    ),
    androidSplashScreenBackgroundColor: z.optional(
      z
        .string({
          invalid_type_error:
            'androidSplashScreenBackgroundColor must be a string',
        })
        .trim()
        .regex(
          /^#[0-9a-fA-F]{6}$/,
          'androidSplashScreenBackgroundColor must be in hexadecimal format'
        )
    ),
    iconId: z.optional(
      z
        .string({
          invalid_type_error: 'icon must be a string',
        })
        .trim()
        .min(1, { message: 'icon must be 1 or more characters long' })
    ),
    mmfId: z.optional(
      z
        .string({
          invalid_type_error: 'mmfId must be a string',
        })
        .trim()
        .min(1, { message: 'mmfId must be 1 or more characters long' })
    ),
    startupVideo: z.optional(
      z
        .object({
          delete: z.literal(true),
        })
        .strict()
        .or(
          z
            .object({
              id: z.string(true),
              mode: z.enum(['once', 'always']),
            })
            .strict()
        )
    ),
  })
  // do not allow unrecognized keys (the ones that are not defined by the object above)
  .strict();
