/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import Lambda from 'aws-sdk/clients/lambda';
import { WebsiteType } from './websiteTypes';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  ERROR_TYPE_NOT_ALLOWED,
  INVALID_WEBSITE_TYPE_CODE,
  UNMANAGED_EXCEPTION_CODE,
} from '@libs/httpResponses/errorCodes';

const lambda = new Lambda({
  region: process.env.REGION,
});

const { WEBSITES_LAMBDA_DESTROY } = process.env as {
  WEBSITES_LAMBDA_DESTROY: string;
};

const { COLL_WEBSITES } = mongoCollections;

type WebsiteDestroyResponseType = {
  statusCode: 200 | 400 | 409 | 500;
  message: string;
};

export default async (website: WebsiteType) => {
  const client = await MongoClient.connect();
  try {
    if (website.type !== 'kubernetes/v1') {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_ALLOWED,
        INVALID_WEBSITE_TYPE_CODE,
        'Invalid website type for this request'
      );
    }

    await lambda
      .invokeAsync({
        FunctionName: WEBSITES_LAMBDA_DESTROY,
        InvokeArgs: JSON.stringify({
          websiteId: website._id,
        }),
      })
      .promise();

    /* Do not wait for website deletion : It times out, it is longer than 30 sec */
    await client.db().collection(COLL_WEBSITES).deleteOne({ _id: website._id });

    return { deletedItem: website };
  } finally {
    client.close();
  }
};
