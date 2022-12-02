import createArtist from '../lib/createArtist';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const pathUserId = event.pathParameters.id;
    const { appId, profileId } = event.requestContext.authorizer;
    if (pathUserId !== userId) {
      throw new Error('Unauthorized');
    }
    const {
      name,
      biography,
      facebook,
      instagram,
      twitter,
      snapchat,
    } = JSON.parse(event.body);

    if (!name) {
      throw new Error('Missing arguments');
    }
    [
      name,
      biography,
      facebook,
      instagram,
      twitter,
      snapchat,
    ].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('Wrong argument type');
      }
    });

    const results = await createArtist(userId, profileId, appId, {
      name,
      biography,
      facebook,
      instagram,
      twitter,
      snapchat,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    let code;
    switch (e.message) {
      case 'Unauthorized':
        code = 403;
        break;
      default:
        code = 500;
        break;
    }
    return response({ code, message: e.message });
  }
};
