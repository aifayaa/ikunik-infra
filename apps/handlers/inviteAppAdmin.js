/* eslint-disable import/no-relative-packages */
import inviteAppAdmin from '../lib/inviteAppAdmin';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

const { INVITE_MAIL_LANG } = process.env;

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const { email, firstname, lastname } = JSON.parse(event.body);

    if (!email || typeof email !== 'string' || email.indexOf('@') < 0) {
      throw new Error('wrong_argument_type');
    }

    if (
      !firstname ||
      typeof firstname !== 'string' ||
      !lastname ||
      typeof lastname !== 'string'
    ) {
      throw new Error('wrong_argument_type');
    }

    const results = await inviteAppAdmin(
      appId,
      email.trim().toLowerCase(),
      firstname.trim(),
      lastname.trim(),
      INVITE_MAIL_LANG
    );

    if (results === false) {
      return response({ code: 404, message: 'app_not_found' });
    }
    return response({ code: 200, body: results });
  } catch (exception) {
    return handleException(exception);
  }
};
