/* eslint-disable import/no-relative-packages */
import { returnedFieldsFilter } from '../lib/fieldsChecks';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import getUserOrgs from '../lib/getUserOrgs';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;

  try {
    const org = await getUserOrgs(userId);
    if (!org) {
      throw new Error('org_not_found');
    }
    return response({ code: 200, body: returnedFieldsFilter(org) });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
