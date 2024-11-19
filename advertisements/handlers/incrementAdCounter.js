/* eslint-disable import/no-relative-packages */
import incrementAdCounter from '../lib/incrementAdCounter';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const { resource } = event;
  const { appId } = event.requestContext.authorizer;
  const adId = event.pathParameters.id;

  try {
    let what;

    if (resource.match('/clicked$')) {
      what = 'click';
    } else if (resource.match('/displayed$')) {
      what = 'display';
    } else {
      throw new Error('mal_formed_request');
    }

    await incrementAdCounter(adId, appId, what);
    return response({ code: 200, body: { ok: true } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
