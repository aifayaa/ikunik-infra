import inviteAppAdmin from '../lib/inviteAppAdmin';
import getPerms from '../../libs/perms/getPerms';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import errorMessage from '../../libs/httpResponses/errorMessage';

/** @TODO fix permissions globally, do something, please... */
const permKey = 'apps_getInfos';

const {
  INVITE_MAIL_LANG,
} = process.env;

export default async (event) => {
  const appId = event.pathParameters.id;
  const userId = event.requestContext.authorizer.principalId;
  try {
    const perms = await getPerms(userId, appId);

    if (!checkPerms(permKey, perms)) {
      throw new Error('access_forbidden');
    }

    const {
      email,
      firstname,
      lastname,
    } = JSON.parse(event.body);

    if (!email || typeof email !== 'string' || email.indexOf('@') < 0) {
      throw new Error('wrong_argument_type');
    }

    if (!firstname || typeof firstname !== 'string' || !lastname || typeof lastname !== 'string') {
      throw new Error('wrong_argument_type');
    }

    const results = await inviteAppAdmin(
      appId,
      email.trim(),
      firstname.trim(),
      lastname.trim(),
      INVITE_MAIL_LANG,
    );

    if (results === false) {
      return response({ code: 404, message: 'app_not_found' });
    }
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
