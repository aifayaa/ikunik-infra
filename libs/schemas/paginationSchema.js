// eslint-disable-next-line import/no-extraneous-dependencies
import { z } from 'zod';

export const paginationSchema = z
  .object({
    start: z.string().transform((val, ctx) => {
      const parsed = parseInt(val, 10);
      // eslint-disable-next-line no-restricted-globals
      if (isNaN(parsed)) {
        const issue = {
          code: z.ZodIssueCode.invalid_type,
          expected: z.ZodParsedType.number,
          received: typeof val,
        };
        if (ctx && ctx.issue && ctx.issue.received) {
          issue.received = ctx.issue.received;
        }
        ctx.addIssue(issue);
        // This is a special symbol you can use to
        // return early from the transform function.
        // It has type `never` so it does not affect the
        // inferred return type.
        return z.NEVER;
      }
      if (parsed < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          type: z.ZodParsedType.number,
          minimum: 0,
          inclusive: true,
          message: 'start must be greater than or equal to 0',
        });
        return z.NEVER;
      }
      return parsed;
    }),

    limit: z.string().transform((val, ctx) => {
      const parsed = parseInt(val, 10);
      // eslint-disable-next-line no-restricted-globals
      if (isNaN(parsed)) {
        const issue = {
          code: z.ZodIssueCode.invalid_type,
          expected: z.ZodParsedType.number,
          received: typeof val,
        };
        if (ctx && ctx.issue && ctx.issue.received) {
          issue.received = ctx.issue.received;
        }

        ctx.addIssue(issue);
        return z.NEVER;
      }
      if (parsed <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          type: z.ZodParsedType.number,
          minimum: 1,
          inclusive: false,
          message: 'limit must be greater than 0',
        });
        return z.NEVER;
      }
      return parsed;
    }),
  })
  .nullish();
