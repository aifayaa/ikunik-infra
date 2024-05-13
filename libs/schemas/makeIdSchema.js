import { z } from 'zod';

export const makeIdSchema = (propertyName) => {
  return z
    .string({
      required_error: `${propertyName} is required`,
      invalid_type_error: `${propertyName} must be a string`,
    })
    .max(100, { message: 'Must be 100 or fewer characters long' });
};
