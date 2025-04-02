import { APIGatewayProxyEvent } from 'aws-lambda';
import { z } from 'zod';

import response, { handleException } from '@libs/httpResponses/response';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import {
  SetCurrentPlanArgsType,
  setCurrentPlanForAppId,
} from 'appsFeaturePlans/lib/setCurrentPlan';
import { checkPermsIsSuperAdmin } from '@libs/perms/checkPermsFor';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '@libs/httpResponses/errorCodes';
import { allPlanTypes } from 'appsFeaturePlans/lib/planTypes';

export default async (event: APIGatewayProxyEvent) => {
  const { id: appId } = event.pathParameters as { id: string };
  const { principalId: userId } = event.requestContext.authorizer as {
    principalId: string;
  };

  try {
    const setCurrentPlanSchema = z
      .object({
        featurePlanId: z.enum(allPlanTypes),
        startedAt: z
          .string({
            required_error: 'startDate is required',
            invalid_type_error: 'startDate must be a string',
          })
          .optional(),
      })
      .required();
    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        `Body is missing from the request`
      );
    }

    // Validate the body of the request
    const body = JSON.parse(event.body);

    const validatedBody = setCurrentPlanSchema.parse(body);

    await checkPermsIsSuperAdmin(userId);

    const computedPlan = await setCurrentPlanForAppId(
      appId,
      validatedBody as SetCurrentPlanArgsType
    );

    return response({
      code: 200,
      body: formatResponseBody({
        data: computedPlan,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
