import blockContent from '../lib/blockContent';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  ERROR_TYPE_NOT_ALLOWED,
  SELF_USER_BLOCK_CODE,
} from '../../libs/httpResponses/errorCodes.ts';

export default async (event) => {
  const { id: contentId, type } = event.pathParameters;
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;

  try {
    if (type === 'user' && contentId === userId) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_ALLOWED,
        SELF_USER_BLOCK_CODE,
        `The user '${userId}' cannot block himself`
      );
    }

    const results = await blockContent(userId, type, contentId, { appId });

    return response({ code: 200, body: results });
  } catch (exception) {
    return handleException(exception);
  }
};
