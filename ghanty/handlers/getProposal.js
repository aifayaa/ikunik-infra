/* eslint-disable import/no-relative-packages */
import getProposal from '../lib/getProposal';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const { id: proposalId } = event.pathParameters;

  try {
    if (!userId) {
      throw new Error('forbidden');
    }

    const body = await getProposal(appId, userId, proposalId);
    return response({ code: 200, body });
  } catch (e) {
    return response(errorMessage(e));
  }
};
