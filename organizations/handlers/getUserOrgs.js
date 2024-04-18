/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import getUserOrgs from '../lib/getUserOrgs';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;

  if (!userId) {
    throw new Error('user_not_found');
  }

  try {
    const orgs = await getUserOrgs(userId);

    if (orgs.length < 1) {
      throw new Error('no_org_found');
    }

    return response({ code: 200, body: orgs });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
