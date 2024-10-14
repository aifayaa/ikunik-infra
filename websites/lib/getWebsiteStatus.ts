/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import Lambda from 'aws-sdk/clients/lambda';
import { WebsiteType } from './websiteTypes';
import {
  ERROR_TYPE_NOT_ALLOWED,
  INVALID_WEBSITE_TYPE_CODE,
} from '@libs/httpResponses/errorCodes';

const lambda = new Lambda({
  region: process.env.REGION,
});

const { WEBSITES_LAMBDA_GET_STATUS } = process.env as {
  WEBSITES_LAMBDA_GET_STATUS: string;
};

type WebsiteStatusResponseType = {
  statusCode: number;
  state: 'running' | 'pending' | 'stopped';
};

export default async (website: WebsiteType) => {
  if (website.type !== 'kubernetes/v1') {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_ALLOWED,
      INVALID_WEBSITE_TYPE_CODE,
      'Invalid website type for this request'
    );
  }

  const response = await lambda
    .invoke({
      FunctionName: WEBSITES_LAMBDA_GET_STATUS,
      Payload: JSON.stringify({
        websiteId: website._id,
      }),
    })
    .promise();

  if (response.Payload) {
    return JSON.parse(
      response.Payload.toString('utf8')
    ) as WebsiteStatusResponseType;
  }
};
