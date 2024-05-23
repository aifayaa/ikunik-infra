/* eslint-disable import/no-relative-packages */
import phoneCleaner from 'phone';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import { sendPreviewInfoEmail } from '../lib/sendPreviewInfoEmail';
import { sendPreviewInfoSMS } from '../lib/sendPreviewInfoSMS';

const { INVITE_MAIL_LANG } = process.env;

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const { appId, principalId: userId } = event.requestContext.authorizer;

    await checkPermsForApp(userId, appId, ['admin']);

    const { email, number } = JSON.parse(event.body);

    if (!email && !number) {
      throw new Error('mal_formed_request');
    }

    if (
      (email && typeof email !== 'string') ||
      (number && typeof number !== 'string')
    ) {
      throw new Error('wrong_argument_type');
    }

    const phoneNumber = phoneCleaner(number, '');
    if (number && phoneNumber.length === 0) {
      throw new Error('wrong_argument_type');
    }

    const promises = [];
    if (email) {
      promises.push(sendPreviewInfoEmail(appId, email, INVITE_MAIL_LANG));
    }
    if (number) {
      promises.push(
        sendPreviewInfoSMS(appId, phoneNumber[0], INVITE_MAIL_LANG)
      );
    }
    const results = await Promise.all(promises);

    return response({ code: 200, body: results });
  } catch (exception) {
    return handleException(exception);
  }
};
