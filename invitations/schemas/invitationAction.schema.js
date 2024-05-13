import { z } from 'zod';

import { invitationActions } from '../const/invitations';

const baseInvitationActionSchema = z
  .object({
    challengeCode: z.string().length(4).optional(),
    action: z.enum([
      invitationActions.ACCEPT,
      invitationActions.DECLINE,
      invitationActions.CANCEL,
      invitationActions.RESEND,
    ]),
  })
  .strict();

export const invitationActionSchema = baseInvitationActionSchema.superRefine(
  (value, ctx) => {
    switch (value.action) {
      case invitationActions.ACCEPT:
      case invitationActions.DECLINE:
        if (!value.challengeCode) {
          ctx.addIssue({
            code: z.ZodIssueCode.invalid_type,
            expected: z.ZodParsedType.string,
            received: z.ZodParsedType.undefined,
            path: ['challengeCode'],
          });
        }
        break;

      default:
        break;
    }
  }
);
