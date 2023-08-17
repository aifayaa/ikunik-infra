import exportUsers from '../lib/exportUsers';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  let {
    fields = 'user._id',
    wholeProfile = 'true',
    ownedBadges = 'true',
  } = event.queryStringParameters || {};

  fields = fields.split(',').filter((x) => (x.trim()));
  wholeProfile = (wholeProfile.match(/^true$/i) !== null);
  ownedBadges = (ownedBadges.match(/^true$/i) !== null);

  try {
    const csv = await exportUsers(appId, { fields, wholeProfile, ownedBadges });
    return response({
      code: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
      },
      body: csv,
      raw: true,
    });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
