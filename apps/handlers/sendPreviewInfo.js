import phoneCleaner from 'phone';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import { sendPreviewInfoEmail } from '../lib/sendPreviewInfoEmail';
import { sendPreviewInfoSMS } from '../lib/sendPreviewInfoSMS';
import { getUserLanguage } from '../../libs/intl/intl';

const permKey = 'apps_sendPreviewInfo';

export default async (event) => {
  try {
    if (!event.body) {
      throw new Error('missing_payload');
    }

    const { authorizer } = event.requestContext;
    const {
      appId,
      perms: rawPerms,
    } = authorizer;
    const perms = JSON.parse(rawPerms);

    if (!checkPerms(permKey, perms)) {
      throw new Error('access_forbidden');
    }

    const {
      email,
      number,
    } = JSON.parse(event.body);

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

    const lang = getUserLanguage(event.headers);
    const promises = [];
    if (email) {
      promises.push(sendPreviewInfoEmail(appId, email, lang));
    }
    if (number) {
      promises.push(sendPreviewInfoSMS(appId, phoneNumber[0], lang));
    }
    const results = await Promise.all(promises);

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
