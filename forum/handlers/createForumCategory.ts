import createForumCategory from '../lib/createForumCategory';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { z } from 'zod';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '@libs/httpResponses/errorCodes';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import { checkFeaturePermsForApp } from '@libs/perms/checkPermsFor';

const bodySchema = z
  .object({
    name: z
      .string({
        required_error: 'name is required',
        invalid_type_error: 'name must be a string',
      })
      .trim()
      .min(1, 'name must be at least 1 character'),
    description: z
      .string({
        required_error: 'description is required',
        invalid_type_error: 'description must be a string',
      })
      .trim(),
    icon: z
      .string({
        required_error: 'icon is required',
        invalid_type_error: 'icon must be a string',
      })
      .trim(),
    badges: z.array(
      z
        .string({
          invalid_type_error: 'badges must be a string',
        })
        .trim()
        .min(1, 'badges must be at least 1 character')
    ),
    badgesAllow: z.enum(['all', 'any']).default('any'),
  })
  .strict()
  .partial({ icon: true });

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId, appId } = event.requestContext.authorizer as {
    principalId: string;
    appId: string;
  };

  try {
    await checkFeaturePermsForApp(userId, appId, ['articlesEditor']);

    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        `Body is missing from the request`
      );
    }

    // Validate the body of the request
    const body = JSON.parse(event.body);

    const newCategoryData = bodySchema.parse(body);

    const dbCategory = await createForumCategory(
      appId,
      userId,
      newCategoryData
    );

    return response({
      code: 200,
      body: formatResponseBody({
        data: dbCategory,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
