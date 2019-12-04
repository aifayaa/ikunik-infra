import editProfile from '../lib/editProfile';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;

  try {
    // Only restricting to self for now, should allow admin users later
    if (userId !== urlId) {
      throw new Error('Forbidden');
    }

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);
    const {
      firstname,
      lastname,
    } = bodyParsed;

    if (
      !firstname ||
      !lastname
    ) {
      throw new Error('mal_formed_request');
    }

    if (
      typeof firstname !== 'string' ||
      typeof lastname !== 'string'
    ) {
      throw new Error('wrong_argument_type');
    }

    if (firstname.length < 2) {
      throw new Error('firstname too short');
    }

    if (lastname.length < 2) {
      throw new Error('lastname too short');
    }

    const results = await editProfile(userId, appId, bodyParsed);
    return response({ code: 200, body: { updated: results } });
  } catch (e) {
    let code = 500;
    switch (e.message) {
      case 'Forbidden': code = 403; break;
      default: code = 500; break;
    }
    return response({ code, message: e.message });
  }
};
