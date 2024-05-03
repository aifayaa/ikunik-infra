/* eslint-disable import/no-relative-packages */
import delOrgApp from '../lib/delOrgApp';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { formatValidationErrors } from '../../libs/httpResponses/formatValidationErrors';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody';
import { delOrgAppSchema } from '../validators/delOrgApp.schema';
import { checkPermsForOrganization } from '../../libs/perms/checkPermsFor';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  APP_ALREADY_BUILD,
  ERROR_TYPE_INTERNAL_EXCEPTION,
} from '../../libs/httpResponses/errorCodes';

const { COLL_APPS } = mongoCollections;

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: orgId, appId } = event.pathParameters;

  try {
    const client = await MongoClient.connect();
    const allowed = await checkPermsForOrganization(userId, orgId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne(
        { _id: appId },
        { projection: { name: 1, setup: 1, builds: 1 } }
      );

    if (!app) {
      throw new Error('app_not_found');
    }
    if (app.setup || app.builds) {
      const errorBody = formatResponseBody({
        errors: [
          {
            type: ERROR_TYPE_INTERNAL_EXCEPTION,
            code: APP_ALREADY_BUILD,
            message: `Cannot delete application '${appId}' because it has been build.`,
          },
        ],
      });
      return response({ code: 200, body: errorBody });
    }

    const body = JSON.parse(event.body);

    // validation
    let validatedBody;
    try {
      validatedBody = delOrgAppSchema.parse(body);
    } catch (err) {
      const errors = formatValidationErrors(err);
      const errorBody = formatResponseBody({ errors });
      return response({ code: 200, body: errorBody });
    }

    const { newOwner } = validatedBody;

    const org = await delOrgApp(orgId, appId, newOwner);
    return response({ code: 200, body: org });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
