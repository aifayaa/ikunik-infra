/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import { makeIdSchema } from '../../libs/schemas/makeIdSchema';

import {
  invitationTargetTypes,
  invitationMethodTypes,
  invitationOrganizationRoles,
  supportedLocales,
} from '../const/invitations';

const baseTargetSchema = z
  .object({
    // TODO: add other invitation target types when implemented
    type: z.enum([invitationTargetTypes.ORGANIZATION]),
  })
  .passthrough();

const organizationTargetSchema = baseTargetSchema
  .extend({
    type: z.literal(invitationTargetTypes.ORGANIZATION),
    organizationId: makeIdSchema('organizationId'),
    role: z.enum(
      [
        invitationOrganizationRoles.OWNER,
        invitationOrganizationRoles.ADMIN,
        invitationOrganizationRoles.MEMBER,
      ],
      {
        required_error: 'role is required',
      }
    ),
  })
  .strict();

const baseMethodSchema = z
  .object({
    // TODO: add other method types when implemented
    type: z.enum([
      invitationMethodTypes.EMAIL,
      invitationMethodTypes.INTERNAL,
      invitationMethodTypes.LINK,
    ]),
  })
  .passthrough();

const emailMethodSchema = baseMethodSchema
  .extend({
    type: z.literal(invitationMethodTypes.EMAIL),
    emailAddress: z
      .string({
        required_error: 'emailAddress is required',
        invalid_type_error: 'emailAddress must be a valid email',
      })
      .email(),
  })
  .strict();

const internalMethodSchema = baseMethodSchema
  .extend({
    type: z.literal(invitationMethodTypes.INTERNAL),
    toUserId: makeIdSchema('toUserId'),
  })
  .strict();

export const createInvitationSchema = z
  .object({
    target: baseTargetSchema.superRefine((value, ctx) => {
      let result;

      switch (value.type) {
        case invitationTargetTypes.ORGANIZATION:
          result = organizationTargetSchema.safeParse(value);
          break;

        default:
          result = baseTargetSchema.safeParse(value);
          break;
      }

      if (!result.success) {
        result.error.issues.forEach((issue) => ctx.addIssue(issue));
      }
    }),

    method: baseMethodSchema.superRefine((value, ctx) => {
      let result;

      switch (value.type) {
        case invitationMethodTypes.EMAIL:
          result = emailMethodSchema.safeParse(value);
          break;

        case invitationMethodTypes.INTERNAL:
          result = internalMethodSchema.safeParse(value);
          break;

        default:
          result = baseMethodSchema.safeParse(value);
          break;
      }

      if (!result.success) {
        result.error.issues.forEach((issue) => ctx.addIssue(issue));
      }
    }),

    expiredAt: z
      .string()
      .datetime()
      .superRefine((date, ctx) => {
        const currentDate = new Date();
        const lessThanCurrentDate = new Date(date) < currentDate;

        if (lessThanCurrentDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            type: z.ZodParsedType.date,
            minimum: currentDate.toISOString(),
            message: 'expiredAt must be greater than the current date',
          });
        }
      })
      .optional(),

    toUserLocale: z.enum([supportedLocales.EN, supportedLocales.FR]).optional(),
  })
  // do not allow unrecognized keys (the ones that are not defined by the object above)
  .strict();
