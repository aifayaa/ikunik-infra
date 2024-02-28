/* eslint-disable import/no-relative-packages */
import getAllUserGeneratedContents from '../lib/getAllUserGeneratedContents';
import response from '../../libs/httpResponses/response';
import AVAILABLE_TYPES from '../userGeneratedContentsTypes.json';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKeys = [
  'userGeneratedContents_all',
  'userGeneratedContents_moderate',
];

const isBooleanStringOrUndefined = (val) =>
  typeof val === 'undefined' || !!(['true', 'false'].indexOf(val) + 1);

const ORDER_BY_LIST = ['reportsCount'];

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const {
    countOnly = false,
    limit,
    moderated,
    moderator = undefined,
    parentId,
    raw,
    reported = undefined,
    reportsCount,
    reviewed = undefined,
    sortBy,
    sortOrder,
    start,
    trashed,
    type,
    userId,
  } = event.queryStringParameters || {};

  try {
    // eslint-disable-next-line eqeqeq
    if (start && parseInt(start, 10) != start) {
      throw new Error('wrong_argument_type');
    }

    // eslint-disable-next-line eqeqeq
    if (limit && parseInt(limit, 10) != limit) {
      throw new Error('wrong_argument_type');
    }

    if (
      (sortBy && !(ORDER_BY_LIST.indexOf(sortBy) + 1)) ||
      (sortOrder && !(['asc', 'desc'].indexOf(sortOrder) + 1)) ||
      !isBooleanStringOrUndefined(moderated) ||
      !isBooleanStringOrUndefined(raw) ||
      !isBooleanStringOrUndefined(reported) ||
      !isBooleanStringOrUndefined(trashed) ||
      !isBooleanStringOrUndefined(reviewed) ||
      !isBooleanStringOrUndefined(reportsCount)
    ) {
      throw new Error('wrong_argument_value');
    }

    if (type && AVAILABLE_TYPES[type] === undefined) {
      throw new Error('This type is not available');
    }

    // Moderator only allowed parameters
    if (
      typeof moderated !== 'undefined' ||
      typeof moderator !== 'undefined' ||
      typeof reported !== 'undefined' ||
      typeof reviewed !== 'undefined' ||
      typeof trashed !== 'undefined'
    ) {
      const perms = JSON.parse(event.requestContext.authorizer.perms);
      const isModerator = checkPerms(permKeys, perms);
      if (!isModerator) {
        const error = new Error(
          'Unauthorized: this operation require moderator level rights'
        );
        error.code = 401;
        throw error;
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
        moderated:
          typeof moderated !== 'undefined' ? moderated === 'true' : moderated,
        moderator,
        parentId,
        raw: isRaw,
        reported,
        reportsCount,
        reviewed:
          typeof reviewed !== 'undefined' ? reviewed === 'true' : reviewed,
        sortBy,
        sortOrder,
        trashed,
      }
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
    return response({ code: e.code || 500, message: e.message });
  }
};
