import { z } from 'zod';

import { invitationStatuses } from '../const/invitations';

export const updateInvitationSchema = z
  .object({
    status: z.enum([
      invitationStatuses.ACCEPTED,
      invitationStatuses.DECLINED,
      invitationStatuses.CANCELED,
    ]),
  })
  .strict();
