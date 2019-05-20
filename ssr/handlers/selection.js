import getSelection from '../../selections/libs/getSelection';
import meta from '../lib/meta';
import redirect from '../lib/redirect';

export default async (event, context, callback) => {
  const redirectUrl = (event.queryStringParameters || {}).redirect_url;
  try {
    const userAgent = event.headers['User-Agent'];
    const redirectResponse = redirect(userAgent, redirectUrl);
    if (redirectResponse) {
      callback(null, redirectResponse);
      return;
    }

    const projectId = event.pathParameters.id;
    const selection = await getSelection(projectId, null, 'crowdaa_app_id');
    const body = meta(
      selection.selectionDisplayName,
      selection.overrideIcon || selection.tracks[0].title,
      selection.tracks[0].projectMediumFileUrl,
    );
    const response = {
      statusCode: 200,
      body,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify(e.message),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
