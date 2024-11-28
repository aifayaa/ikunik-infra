/* eslint-disable import/no-relative-packages */
import getAllUserGeneratedContents from '../lib/getAllUserGeneratedContents';
import response from '../../libs/httpResponses/response.ts';
import AVAILABLE_TYPES from '../userGeneratedContentsTypes.json';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

const isBooleanStringOrUndefined = (val) =>
  typeof val === 'undefined' || !!(['true', 'false'].indexOf(val) + 1);

const ORDER_BY_LIST = ['reportsCount'];

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const {
    countOnly = false,
    limit,
    moderated,
    moderator = undefined,
    parentId,
    ugcId,
    raw,
    reported = undefined,
    reportsCount,
    reviewed = undefined,
    sortBy,
    sortOrder,
    start,
    trashed,
    type,
    userId: searchedUserId,
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
      typeof reviewed !== 'undefined' ||
      typeof trashed !== 'undefined'
    ) {
      await checkPermsForApp(userId, appId, ['moderator']);
    }

    const isRaw = raw !== 'false';
    const { items, totalCount } = await getAllUserGeneratedContents(
      appId,
      start,
      limit,
      type,
      searchedUserId,
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
        ugcId,
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
