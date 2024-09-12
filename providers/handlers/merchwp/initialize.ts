/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import { APIGatewayProxyEvent } from 'aws-lambda';
import initializeMerchWP, {
  MerchWPInitializeParametersType,
} from '../../lib/merchwp/initialize';
import response, {
  handleException,
} from '../../../libs/httpResponses/response';
import { CrowdaaError } from '../../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '../../../libs/httpResponses/errorCodes';
import { formatResponseBody } from '../../../libs/httpResponses/formatResponseBody';

export default async (event: APIGatewayProxyEvent) => {
  try {
    const merchWPInitializeSchema = z
      .object({
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
          })
          .strict(),
        app: z
          .object({
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
          })
          .strict(),
        website: z
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
          })
          .strict(),
      })
      .strict()
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
    const validatedBody = merchWPInitializeSchema.parse(body);

    const initializationResponse = await initializeMerchWP(
      validatedBody as MerchWPInitializeParametersType
    );

    return response({
      code: 200,
      body: formatResponseBody({
        data: initializationResponse,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
