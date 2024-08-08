import { z } from 'zod';

export const putComputeActiveUsersForDaySchema = z
  .object({
    day: z
      .string()
      .datetime(),
    appId: z
      .string({
        required_error: 'appId is required',
        invalid_type_error: 'appId must be a string',
      })
      .max(100, { message: 'Must be 100 or fewer characters long' }),
  })
  // do not allow unrecognized keys (the ones that are not defined by the object above)
  .strict();

export type PutComputeActiveUsersForDaySchema = z.infer<typeof putComputeActiveUsersForDaySchema>;