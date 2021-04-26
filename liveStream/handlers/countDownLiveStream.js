import getLiveStream from '../lib/getLiveStream';
import response from '../../libs/httpResponses/response';
import { formatMessage, intlInit, getUserLanguage } from '../../libs/intl/intl';

export default async (event) => {
  try {
    const { id } = event.pathParameters;
    const [appId, liveStreamId] = id.split(',');

    const liveStream = await getLiveStream(appId, liveStreamId);

    if (!liveStream) {
      throw new Error('not_found');
    }

    const lang = getUserLanguage(event.headers);
    intlInit(lang);

    const body = formatMessage('liveStream:countdown_html_page', {
      startDateTime: JSON.stringify(liveStream.startDateTime.getTime()),
      streamUrl: JSON.stringify(liveStream.hlsPlaybackUrl),
    });

    return response({
      code: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      body,
      raw: true,
    });
  } catch (e) {
    return response({ code: 400, message: e.message });
  }
};
