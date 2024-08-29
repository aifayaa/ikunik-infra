/* eslint-disable import/no-relative-packages */
import getLiveStream from '../lib/getLiveStream';
import response from '../../libs/httpResponses/response.ts';
import { formatMessage, intlInit, getUserLanguage } from '../../libs/intl/intl';
import { checkAppPlanForLimitAccess } from '../../appsFeaturePlans/lib/checkAppPlanForLimits.ts';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
} from '../../libs/httpResponses/errorCodes.ts';

export default async (event) => {
  try {
    const { id } = event.pathParameters;
    const [appId, liveStreamId] = id.split(',');

    const allowed = await checkAppPlanForLimitAccess(appId, 'liveStreams');

    if (!allowed) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_ALLOWED,
        APP_FEATURE_PLAN_QUOTA_EXCEEDED_CODE,
        `The current plan for app '${appId}' does not allow this operation`
      );
    }

    const liveStream = await getLiveStream(appId, liveStreamId);

    if (!liveStream) {
      throw new Error('not_found');
    }

    const lang = getUserLanguage(event.headers);
    intlInit(lang);

    const body = formatMessage('liveStream:view_stream_html_page', {
      startDateTime: JSON.stringify(liveStream.startDateTime.getTime()),
      streamUrl: JSON.stringify(liveStream.playbackUrl),
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
