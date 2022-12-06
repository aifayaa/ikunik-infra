import getLineupType from '../lib/getLineupType';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  try {
    const someId = event.pathParameters.id;
    let type;
    switch (event.resource.split('/')[1]) {
      case 'artists':
        type = 'artistId';
        break;
      case 'stages':
        type = 'stageId';
        break;
      case 'festivals':
        type = 'festivalId';
        break;
      default:
        type = undefined;
    }
    const results = await getLineupType(someId, type, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
