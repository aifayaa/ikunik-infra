/* eslint-disable import/no-relative-packages */
import reportUserGeneratedContents from '../lib/reportUserGeneratedContents';
import response from '../../libs/httpResponses/response.ts';
import sendEmailToAdmin from '../lib/sendEmailToAdmin';
import emailTemplate from '../lib/emailUgcReportTemplate';
import { getUserLanguage } from '../../libs/intl/intl';

const AVAILABLE_REASONS = ['inappropriate'];

export default async (event) => {
  /* Get some standard parameters */
  const { appId } = event.requestContext.authorizer;
  const userId = event.requestContext.authorizer.principalId;
  const userGeneratedContentsId = event.pathParameters.id;

  try {
    /* Check if body is present */
    if (!event.body) {
      throw new Error('missing_payload');
    }

    /* Parse body and get parameters from it */
    const bodyParsed = JSON.parse(event.body);
    const { details, reason = 'inappropriate' } = bodyParsed;

    /* Proceed to some checks */
    if (!reason || !details) {
      throw new Error('missing_arguments');
    }
    [reason, details].forEach((item) => {
      if (item && typeof item !== 'string') {
        throw new Error('wrong_argument_type');
      }
    });
    if (!(AVAILABLE_REASONS.indexOf(reason) + 1)) {
      throw new Error('unavailable_reason');
    }

    /* Call the lib to register the report into the database */
    const results = await reportUserGeneratedContents(
      appId,
      userId,
      userGeneratedContentsId,
      reason,
      details
    );

    const lang = getUserLanguage(event.headers);

    /*
      try to send email to appAdmin
      if it failled for any reason just ignore error
      we don't want this request to be concidered as failed
      since content has successfully been edited

      This portion of code could be externalised in an
      other serverless function which could be called without
      waiting Promise to be resolved to permit a quick response
      to the requester
    */
    try {
      const { subject, body } = await emailTemplate(
        userId,
        appId,
        userGeneratedContentsId,
        reason,
        details,
        lang
      );
      await sendEmailToAdmin(lang, subject, body, appId);
    } catch (e) {
      // console.log('Error when sending mail to admin', e);
    }
    return response({ code: 200, body: results });
  } catch (e) {
    /* Change code depending of the the message returned */
    let code;

    switch (e.message) {
      case 'missing_arguments':
      case 'missing_payload':
      case 'unavailable_reason':
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
