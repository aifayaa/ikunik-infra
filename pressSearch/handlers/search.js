/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';
import search from '../lib/search';

export const handleSearch = async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  let isAdmin = false;
  try {
    if (userId) {
      isAdmin = await checkPermsForApp(userId, appId, ['admin'], {
        dontThrow: true,
      });
    }

    const { text, skip, limit } = event.queryStringParameters || {};
    const searchOptions = {
      skip: parseInt(skip, 10) || undefined,
      limit: parseInt(limit, 10) || undefined,
      published: true,
      trashed: false,
    };

    if (isAdmin) {
      const { published, trashed, allFields } =
        event.queryStringParameters || {};

      if (published) {
        if (/^true$/i.test(published)) searchOptions.published = true;
        else if (/^(all|any)$/i.test(published)) searchOptions.published = null;
        else searchOptions.published = false;
      }
      if (trashed) {
        if (/^true$/i.test(trashed)) searchOptions.trashed = true;
        else if (/^(all|any)$/i.test(trashed)) searchOptions.trashed = null;
        else searchOptions.trashed = false;
      }
      if (allFields) {
        if (/^true$/i.test(allFields)) searchOptions.allFields = true;
        else if (/^(all|any)$/i.test(allFields)) searchOptions.allFields = null;
        else searchOptions.allFields = false;
      }
    }

    const results = await search(text, appId, searchOptions);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
