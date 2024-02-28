/* eslint-disable import/no-relative-packages */
import validator from 'validator';
import Lambda from 'aws-sdk/clients/lambda';
import removeBlastToken from '../lib/removeBlastToken';
import response from '../../libs/httpResponses/response';

const { REGION, STAGE } = process.env;

const lambda = new Lambda({ region: REGION });

export default async ({ type, userId, qte, appId }) => {
  try {
    if (!userId) throw new Error('missing user');
    if (!validator.isInt(qte, { min: 0, allow_leading_zeroes: false })) {
      throw new Error('wrong quantity');
    }

    if (!validator.isIn(type, ['email', 'notification', 'text'])) {
      throw new Error('invalid type value');
    }
    const res = await lambda
      .invoke({
        FunctionName: `users-${STAGE}-getProfile`,
        Payload: JSON.stringify({
          pathParameters: { id: userId },
          requestContext: { authorizer: { principalId: userId, appId } },
        }),
      })
      .promise();
    const { StatusCode, Payload } = res;
    if (StatusCode !== 200) throw new Error('failed to get profile');
    const { body } = JSON.parse(Payload);
    if (!body) throw new Error('wrong profile');
    const { _id } = JSON.parse(body);
    if (!_id) throw new Error('cannot get profile data from profile service');
    const results = await removeBlastToken(type, _id, qte, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
