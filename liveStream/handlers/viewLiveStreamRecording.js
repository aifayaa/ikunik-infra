/* eslint-disable import/no-relative-packages */
import getLiveStream from '../lib/getLiveStream';
import response from '../../libs/httpResponses/response.ts';
import { formatMessage, intlInit, getUserLanguage } from '../../libs/intl/intl';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';

export default async (event) => {
  try {
    const { id } = event.pathParameters;
    const [appId, liveStreamId] = id.split(',');
    const { recordingId } = event.queryStringParameters || {};

    const allowed = await checkAppPlanForLimitAccess(appId, 'liveStreams');

    if (!allowed) {
      throw new Error('app_limits_exceeded');
    }

    const liveStream = await getLiveStream(appId, liveStreamId);

    if (
      !liveStream ||
      !liveStream.recordings ||
      liveStream.recordings.length === 0
    ) {
      throw new Error('not_found');
    }

    let recording = null;
    for (let i = 0; i < liveStream.recordings.length && !recording; i += 1) {
      const current = liveStream.recordings[i];
      if (current.root === recordingId) {
        recording = current;
      }
    }

    if (!recording) {
      throw new Error('not_found');
    }

    const lang = getUserLanguage(event.headers);
    intlInit(lang);

    const body = formatMessage('liveStream:view_recording_html_page', {
      recordingUrl: JSON.stringify(
        `${recording.baseUrl}/${recording.root}/${recording.playlist}`
      ),
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
