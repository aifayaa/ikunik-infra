/* eslint-disable import/no-relative-packages */
import useProposal from '../lib/useProposal';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const { id: proposalId } = event.pathParameters;

  try {
    if (!userId) {
      throw new Error('forbidden');
    }

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    const body = await useProposal(appId, userId, proposalId, bodyParsed);
    return response({ code: 200, body });
  } catch (e) {
    return response(errorMessage(e));
  }
};
