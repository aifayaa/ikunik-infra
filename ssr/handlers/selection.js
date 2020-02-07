import getAppId from '../lib/getAppId';
import getSelection from '../../selections/libs/getSelection';
import meta from '../lib/meta';
import redirect from '../lib/redirect';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const redirectUrl = (event.queryStringParameters || {}).redirect_url;
  const { appName } = (event.queryStringParameters || {});

  try {
    const userAgent = event.headers['User-Agent'];
    const appId = await getAppId(appName);
    const redirectResponse = await redirect(userAgent, redirectUrl, appId);
    if (redirectResponse) {
      return redirectResponse;
    }
    const projectId = event.pathParameters.id;
    const selection = await getSelection(projectId, null, appId);
    const body = meta(
      selection.selectionDisplayName,
      selection.overrideIcon || selection.tracks[0].title,
      selection.tracks[0].projectMediumFileUrl,
    );
    return response({ code: 200, body, raw: true });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
