/* eslint-disable import/no-relative-packages */
import { getOnboardingFor, OnboardingReturnType } from '../lib/onboarding';
import response, { handleException } from '../../libs/httpResponses/response';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  INVALID_ARGUMENT_VALUE_CODE,
  MISSING_QUERY_PARAMETERS_CODE,
} from '@libs/httpResponses/errorCodes';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';

export default async (event: APIGatewayProxyEvent) => {
  const { principalId: userId } = event.requestContext.authorizer as {
    principalId: string;
  };
  const { target = 'user', id } = (event.queryStringParameters || {}) as {
    target?: 'application' | 'organization' | 'user';
    id?: string;
  };

  try {
    let onboarding: OnboardingReturnType = {};
    if (!target) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_QUERY_PARAMETERS_CODE,
        'Missing parameter "target"'
      );
    }
    if (target === 'user') {
      onboarding = await getOnboardingFor(userId);
    } else if (target === 'application') {
      if (!id) {
        throw new CrowdaaError(
          ERROR_TYPE_VALIDATION_ERROR,
          MISSING_QUERY_PARAMETERS_CODE,
          'Missing parameter "id" for target=application'
        );
      }
      onboarding = await getOnboardingFor(userId, { appId: id });
    } else if (target === 'organization') {
      if (!id) {
        throw new CrowdaaError(
          ERROR_TYPE_VALIDATION_ERROR,
          MISSING_QUERY_PARAMETERS_CODE,
          'Missing parameter "id" for target=organization'
        );
      }
      onboarding = await getOnboardingFor(userId, { orgId: id });
    } else {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        INVALID_ARGUMENT_VALUE_CODE,
        'Invalid value for parameter "target"'
      );
    }

    return response({
      code: 200,
      body: formatResponseBody({
        data: onboarding,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
