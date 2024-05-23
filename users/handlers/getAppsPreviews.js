/* eslint-disable import/no-relative-packages */
import { typeCheck } from 'type-check';
import errorMessage from '../../libs/httpResponses/errorMessage';
import getAppsPreviews from '../lib/getAppsPreviews';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: urlId } = event.pathParameters;
  const { sortBy = 'name', sortOrder = 'desc' } =
    event.queryStringParameters || {};

  try {
    if (userId !== urlId) {
      throw new Error('forbidden');
    }

    if (sortBy) {
      if (!typeCheck('{ sortBy: String }', { sortBy })) {
        throw new Error('wrong_argument_type');
      }

      /* Using array here in case we add other sort values later */
      if (['name'].indexOf(sortBy) < 0) {
        throw new Error('wrong_argument_value');
      }
    }

    if (sortOrder) {
      if (!typeCheck('{ sortOrder: String }', { sortOrder })) {
        throw new Error('wrong_argument_type');
      }

      if (['asc', 'desc'].indexOf(sortOrder) < 0) {
        throw new Error('wrong_argument_value');
      }
    }

    const appsResults = await getAppsPreviews(userId, { sortBy, sortOrder });

    return response({
      code: 200,
      body: { items: appsResults, totalCount: appsResults.length },
    });
  } catch (e) {
    return response(errorMessage(e));
  }
};
