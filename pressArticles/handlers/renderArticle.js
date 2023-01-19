import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import mdToHtml from '../lib/mdParsing/mdToHtml';

const permKey = 'pressArticles_all';

export default (event) => {
  try {
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    if (!checkPerms(permKey, perms)) {
      return response({ code: 403, message: 'access_forbidden' });
    }
    if (!event.body) {
      throw new Error('mal_formed_request');
    }
    const {
      md,
    } = JSON.parse(event.body);
    if (!md) {
      throw new Error('mal_formed_request');
    }

    const html = mdToHtml(md);
    return Promise.resolve(response({ code: 200, body: { html } }));
  } catch (e) {
    return Promise.resolve(response({ code: 500, message: e.message }));
  }
};
