/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response';
import mdToHtml from '../lib/mdParsing/mdToHtml';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      return response({ code: 403, message: 'access_forbidden' });
    }
    if (!event.body) {
      throw new Error('mal_formed_request');
    }
    const { md } = JSON.parse(event.body);
    if (!md) {
      throw new Error('mal_formed_request');
    }

    const html = mdToHtml(md);
    return response({ code: 200, body: { html } });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
