/* eslint-disable import/no-relative-packages */
import { z } from 'zod';
import createApp from '../lib/createApp';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import { filterAppPrivateFields } from '../lib/appsUtils.ts';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors.ts';
import { putAppInOrgHandlerBody } from '../../organizations/handlers/putAppInOrg';

import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { CrowdaaErrorWithErrorBody } from '../../libs/httpResponses/CrowdaaErrorWithErrorBody';

const { COLL_APPS } = mongoCollections;

export const createAppSchema = z.object({
  name: z
    .string({
      required_error: 'name is required',
      invalid_type_error: 'name must be a string',
    })
    .max(80, { message: 'Must be 80 or fewer characters long' })
    .trim(),
  protocol: z
    .string({
      invalid_type_error: 'protocol must be a string',
    })
    .min(1, { message: 'Must be at least 1 character long' })
    .trim(),
  orgId: z
    .string({
      invalid_type_error: 'orgId must be a string',
    })
    .min(1, { message: 'Must be at least 1 character long' })
    .trim(),
});

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;

  try {
    const body = JSON.parse(event.body);

    let validatedBody;
    // validation
    try {
      validatedBody = createAppSchema
        .partial({
          protocol: true,
          orgId: true,
        })
        .parse(body);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const errorBody = formatResponseBody({ errors });
      throw new CrowdaaErrorWithErrorBody(errorBody);
    }

    const { name, protocol, orgId } = validatedBody;

    const app = await createApp(name, userId, { protocol });

    // If no orgId is precise as input: return the created app
    if (!orgId) {
      return response({
        code: 200,
        body: formatResponseBody({
          data: filterAppPrivateFields(app),
        }),
      });
    }

    // If an organization is given as input: move the application to the organization
    const { _id: appId } = app;
    await putAppInOrgHandlerBody(userId, orgId, appId);

    const client = await MongoClient.connect();
    const movedApp = await client
      .db()
      .collection(COLL_APPS)
      .findOne({ _id: appId });

    return response({
      code: 200,
      body: formatResponseBody({
        data: filterAppPrivateFields(movedApp),
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
