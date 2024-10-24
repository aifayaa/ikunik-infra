/* eslint-disable import/no-relative-packages */
import { APIGatewayProxyEvent } from 'aws-lambda';
import response, { handleException } from '@libs/httpResponses/response';
import { reportType, reportTypes } from 'reportedContents/lib/type';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_VALIDATION_ERROR,
  INVALID_ARGUMENT_VALUE_CODE,
  MISSING_BODY_CODE,
  SELF_USER_REPORT_CODE,
} from '@libs/httpResponses/errorCodes';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import reportContent from 'reportedContents/lib/reportContent';
import { isDefined } from '@libs/check';
import { z } from 'zod';
import { getUserLanguage } from '@libs/intl/intl';
import emailTemplate from '../../userGeneratedContents/lib/emailUgcUserReportTemplate';
import sendEmailToAdmin from '../../userGeneratedContents/lib/sendEmailToAdmin';

export default async (event: APIGatewayProxyEvent) => {
  const { type, id: userGeneratedContentsId } = event.pathParameters as {
    type: reportType;
    id: string;
  };
  const { principalId: userId } = event.requestContext.authorizer as {
    principalId: string;
  };
  const { appId } = event.requestContext.authorizer as { appId: string };

  try {
    if (!reportTypes.includes(type)) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        INVALID_ARGUMENT_VALUE_CODE,
        `The type parameter '${type}' must have one of the following value: ${reportTypes.join(', ')}`
      );
    }

    if (type === 'user' && userGeneratedContentsId === userId) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_ALLOWED,
        SELF_USER_REPORT_CODE,
        `The user '${userId}' cannot report himself`
      );
    }

    if (!isDefined(event.body)) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_BODY_CODE,
        `Missing body of the request`
      );
    }

    const body = JSON.parse(event.body);

    const reportContentSchema = z.object({
      details: z
        .string({
          required_error: 'details is required',
          invalid_type_error: 'details must be a string',
        })
        .max(255, { message: 'Must be 255 or fewer characters long' })
        .trim(),
      reason: z
        .string({
          required_error: 'reason is required',
          invalid_type_error: 'reason must be a string',
        })
        .max(255, { message: 'Must be 255 or fewer characters long' })
        .trim(),
      ugcId: z
        .string({
          required_error: 'ugcId is required',
          invalid_type_error: 'ugcId must be a string',
        })
        .max(255, { message: 'Must be 255 or fewer characters long' })
        .trim(),
    });

    // validation
    const validatedBody = reportContentSchema.parse(body);

    const { details, reason, ugcId } = validatedBody;

    const results = await reportContent(userId, type, userGeneratedContentsId, {
      appId,
      details,
      reason,
      ugcId,
    });

    const lang = getUserLanguage(event.headers);

    /*
      try to send email to appAdmin
      if it failled for any reason just ignore error
      we don't want this request to be concidered as failed
      since content has successfully been edited

      This portion of code could be externalised in an
      other serverless function which could be called without
      waiting Promise to be resolved to permit a quick response
      to the requester
    */
    try {
      const { subject, body } = await emailTemplate(
        userId,
        appId,
        userGeneratedContentsId,
        reason,
        details,
        lang
      );
      await sendEmailToAdmin(lang, subject, body, appId);
    } catch (e) {
      // console.log('Error when sending mail to admin', e);
    }

    return response({ code: 200, body: formatResponseBody({ data: results }) });
  } catch (exception) {
    return handleException(exception);
  }
};
