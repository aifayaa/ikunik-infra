import getAllUserGeneratedContents from '../lib/getAllUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import AVAILABLE_TYPES from '../userGeneratedContentsTypes.json';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKeys = [
  'userGeneratedContents_all',
  'userGeneratedContents_moderate',
];

const isBooleanStringOrUndefined = (val) => !!(val && (['true', 'false'].indexOf(val) + 1));

const ORDER_BY_LIST = [
  'reportsCount',
];

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const {
    countOnly = false,
    limit,
    moderated,
    parentId,
    raw,
    reported = undefined,
    reportsCount,
    reviewed = undefined,
    start,
    trashed,
    type,
    userId,
    sortBy,
    sortOrder,
  } = event.queryStringParameters || {};

  try {
    // eslint-disable-next-line eqeqeq
    if (start && parseInt(start, 10) != start) {
      throw new Error('Wrong argument type');
    }

    // eslint-disable-next-line eqeqeq
    if (limit && parseInt(limit, 10) != limit) {
      throw new Error('Wrong argument type');
    }

    if (sortBy && !(ORDER_BY_LIST.indexOf(sortBy) + 1)) {
      throw new Error('Wrong argument value');
    }

    if (sortOrder && !(['asc', 'desc'].indexOf(sortOrder) + 1)) {
      throw new Error('Wrong argument value');
    }

    if (
      isBooleanStringOrUndefined(moderated) &&
      isBooleanStringOrUndefined(raw) &&
      isBooleanStringOrUndefined(reported) &&
      isBooleanStringOrUndefined(trashed) &&
      isBooleanStringOrUndefined(reviewed) &&
      isBooleanStringOrUndefined(reportsCount)
    ) {
      throw new Error('Wrong argument value');
    }

    if (type && AVAILABLE_TYPES[type] === undefined) {
      throw new Error('This type is not available');
    }


    // Moderator only allowed parameters
    if (
      typeof moderated !== 'undefined' &&
      typeof reported !== 'undefined' &&
      typeof reviewed !== 'undefined' &&
      typeof trashed !== 'undefined'
    ) {
      const perms = JSON.parse(event.requestContext.authorizer.perms);
      const isModerator = checkPerms(permKeys, perms);
      if (!isModerator) {
        const error = new Error('Unauthorized: this operation require moderator level rights');
        error.code = 401;
      }
    }

    const isRaw = raw !== 'false';
    const { items, totalCount } = await getAllUserGeneratedContents(
      appId,
      start,
      limit,
      type,
      userId,
      {
        countOnly: countOnly && !isRaw,
        moderated: typeof moderated !== 'undefined' ? moderated === 'true' : moderated,
        parentId,
        raw: isRaw,
        reported,
        reportsCount,
        reviewed: typeof reviewed !== 'undefined' ? reviewed === 'true' : reviewed,
        trashed,
        sortBy,
        sortOrder,
      },
    );
    let body;
    if (isRaw) {
      body = items;
    } else {
      body = { totalCount };
      if (!countOnly) {
        body.items = items;
      }
    }
    return response({ code: 200, body });
  } catch (e) {
    if (e.code) {
      return response({ code: e.code, message: e.message });
    }
    return response({ code: 500, message: e.message });
  }
};
