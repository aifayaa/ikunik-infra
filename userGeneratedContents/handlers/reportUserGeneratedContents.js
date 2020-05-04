import reportUserGeneratedContents from '../lib/reportUserGeneratedContents';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const userId = event.requestContext.authorizer.principalId;
  const userGeneratedContentsId = event.pathParameters.id;

  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const bodyParsed = JSON.parse(event.body);
    const {
      details,
      reason = 'inappropriate',
    } = bodyParsed;

    if (!reason || !details) {
      throw new Error('missing_arguments');
    }

    [
      reason,
      details,
    ].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('wrong_argument_type');
      }
    });

    const results = await reportUserGeneratedContents(
      appId,
      userId,
      userGeneratedContentsId,
      reason,
      details,
    );

    return response({ code: 200, body: results });
  } catch (e) {
    /* Change code depending of the the message returned */
    let code;

    switch (e.message) {
      case 'missing_arguments':
      case 'missing_payload':
      case 'wrong_argument_type':
        code = 400;
        break;
      case 'ugc_not_found':
        code = 404;
        break;
      default:
        code = 500;
    }

    return response({ code, message: e.message });
  }
};
