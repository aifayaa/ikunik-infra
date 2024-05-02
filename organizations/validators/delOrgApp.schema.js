// eslint-disable-next-line import/no-extraneous-dependencies
import { z } from 'zod';

export const delOrgAppSchema = z
  .object({
    newOwner: z
      .string({
        required_error: 'newOwner is required',
        invalid_type_error: 'newOwner must be a string',
      })
      .max(80, { message: 'Must be 80 or fewer characters long' })
      .trim(),
  })
  .required();
