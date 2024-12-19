/* eslint-disable import/no-relative-packages */
import response from '../../libs/httpResponses/response.ts';
import { getArticles } from '../lib/getArticles';

export default async (event) => {
  try {
    const { resource = '/press/articles/v2' } = event;
    const { appId, principalId: userId } = event.requestContext.authorizer;
    const {
      category,
      firstLoad,
      limit,
      noDateFilter,
      noPictures,
      reversedFlow,
      start,
      startDate,
    } = event.queryStringParameters || {};
    let { eventsInterval } = event.queryStringParameters || {};

    const checkBadges = !!resource.match(/^\/press\/articles\/v2/);

    if (eventsInterval) {
      eventsInterval = eventsInterval
        .split(',')
        .map((dateStr) => new Date(dateStr));
      if (eventsInterval.length !== 2) {
        throw new Error('mal_formed_request');
      }
      eventsInterval.forEach((date) => {
        if (Number.isNaN(date.getTime())) {
          throw new Error('mal_formed_request');
        }
      });
    } else {
      eventsInterval = [null, null];
    }

    const results = await getArticles(category, start, limit, appId, {
      checkBadges,
      eventsInterval,
      firstLoad: firstLoad === 'true',
      getPictures: noPictures !== 'true',
      noDateFilter: noDateFilter === 'true',
      reversedFlow: reversedFlow === 'true',
      startDate,
      userId,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
