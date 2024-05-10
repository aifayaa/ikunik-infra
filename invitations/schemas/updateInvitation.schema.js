import { z } from 'zod';

import { invitationStatuses } from '../const/invitations';

const baseUpdateInvitationSchema = z
  .object({
    challengeCode: z.string().length(4).optional(),
    status: z.enum([
      invitationStatuses.ACCEPTED,
      invitationStatuses.DECLINED,
      invitationStatuses.CANCELED,
    ]),
  })
  .strict();

export const updateInvitationSchema = baseUpdateInvitationSchema.superRefine(
  (value, ctx) => {
    switch (value.status) {
      case invitationStatuses.ACCEPTED:
      case invitationStatuses.DECLINED:
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
