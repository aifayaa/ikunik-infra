/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  setAppIcon,
  setupAccount,
  setupApp,
  setupWebsite,
} from '../../lib/merchwp/setup';
import response, {
  handleException,
} from '../../../libs/httpResponses/response';
import { CrowdaaError } from '../../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
  MISSING_QUERY_PARAMETERS_CODE,
} from '../../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '../../../libs/httpResponses/formatResponseBody';
import { AppType } from '@apps/lib/appEntity';
import { WebsiteKubernetesV1Type } from 'websites/lib/websiteTypes';
import { checkPermsForApp } from '@libs/perms/checkPermsFor';

type StepsType = 'account-app' | 'app-icon' | 'website';

type SetupResponseBodyType = {
  account?: {
    userId: string;
    authToken: string;
  };
  app?: AppType;
  icon?: { set: boolean };
  website?: WebsiteKubernetesV1Type;
};

const merchWPStepAccountAppSchema = z
  .object({
    account: z.object({
      email: z
        .string({
          required_error: 'email is required',
          invalid_type_error: 'email must be a string',
        })
        .trim(),
      password: z
        .string({
          required_error: 'password is required',
          invalid_type_error: 'password must be a string',
        })
        .trim(),

      username: z
        .string({
          required_error: 'username is required',
          invalid_type_error: 'username must be a string',
        })
        .trim(),
      profile: z
        .object({
          username: z
            .string({
              required_error: 'username is required',
              invalid_type_error: 'username must be a string',
            })
            .trim(),
        })
        .optional(),
      utm: z.object({}).optional(),
    }),
    app: z.object({
      name: z
        .string({
          required_error: 'name is required',
          invalid_type_error: 'name must be a string',
        })
        .trim(),
      color: z
        .string({
          invalid_type_error: 'color must be a string',
        })
        .min(1, { message: 'Must be at least 1 character long' })
        .trim(),
    }),
  })
  .required();

const merchWPStepAppIconSchema = z
  .object({
    appId: z
      .string({
        required_error: 'appId is required',
        invalid_type_error: 'appId must be a string',
      })
      .trim(),
    iconId: z
      .string({
        required_error: 'iconId is required',
        invalid_type_error: 'iconId must be a string',
      })
      .trim(),
  })
  .required();

const merchWPStepWebsiteSchema = z
  .object({
    domains: z
      .array(
        z
          .string({
            required_error: 'domains is required',
            invalid_type_error: 'domains must be a string',
          })
          .trim()
      )
      .min(1, 'domains must contain at least one domain!'),
    sync: z
      .object({
        imageId: z
          .string({
            required_error: 'imageId is required',
            invalid_type_error: 'imageId must be a string',
          })
          .trim(),
        imageUrl: z
          .string({
            required_error: 'imageUrl is required',
            invalid_type_error: 'imageUrl must be a string',
          })
          .trim(),
      })
      .required(),
    package: z
      .string({
        required_error: 'package is required',
        invalid_type_error: 'package must be a string',
      })
      .trim(),
    colors: z
      .object({
        primary: z
          .string({
            required_error: 'primary is required',
            invalid_type_error: 'primary must be a string',
          })
          .min(1, { message: 'Must be at least 1 character long' })
          .trim(),
        secondary: z
          .string({
            required_error: 'secondary is required',
            invalid_type_error: 'secondary must be a string',
          })
          .min(1, { message: 'Must be at least 1 character long' })
          .trim(),
      })
      .required(),
    account: z
      .object({
        email: z
          .string({
            required_error: 'email is required',
            invalid_type_error: 'email must be a string',
          })
          .trim(),
        password: z
          .string({
            required_error: 'password is required',
            invalid_type_error: 'password must be a string',
          })
          .trim(),
        authToken: z
          .string({
            required_error: 'authToken is required',
            invalid_type_error: 'authToken must be a string',
          })
          .trim(),
      })
      .required(),
  })
  .required();

export default async (event: APIGatewayProxyEvent) => {
  const { step } = event.pathParameters as { step: StepsType };

  try {
    if (!event.body) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        'Body is missing from the request'
      );
    }

    const responseData: SetupResponseBodyType = {};
    if (step === 'account-app') {
      const body = JSON.parse(event.body);
      const validatedBody = merchWPStepAccountAppSchema.parse(body);

      responseData.account = await setupAccount(validatedBody.account);
      responseData.app = await setupApp(
        validatedBody.app,
        responseData.account.userId
      );
    } else if (step === 'app-icon') {
      const { appId, principalId: userId } = event.requestContext
        .authorizer as {
        appId: string;
        principalId: string;
      };
      await checkPermsForApp(userId, appId, ['admin']);

      const body = JSON.parse(event.body);
      const validatedBody = merchWPStepAppIconSchema.parse(body);

      responseData.icon = await setAppIcon(appId, validatedBody.iconId);
    } else if (step === 'website') {
      const { appId, principalId: userId } = event.requestContext
        .authorizer as {
        appId: string;
        principalId: string;
      };
      await checkPermsForApp(userId, appId, ['admin']);

      const body = JSON.parse(event.body);
      const validatedBody = merchWPStepWebsiteSchema.parse(body);

      responseData.website = await setupWebsite(userId, appId, validatedBody);
    } else {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_QUERY_PARAMETERS_CODE,
        'Step is missing from the request URL'
      );
    }

    return response({
      code: 200,
      body: formatResponseBody({
        data: responseData,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
