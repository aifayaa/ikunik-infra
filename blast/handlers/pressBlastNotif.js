/* eslint-disable import/no-relative-packages */
import PQueue from 'p-queue';
import flatten from 'lodash/flatten';
import queue from 'async/queue';
import blastNotif from '../lib/blastNotif';
import buildPipeline from '../../crowd/lib/pipelines/pressPipeline';
import errorMessage from '../../libs/httpResponses/errorMessage';
import logBlast from '../lib/pressLogBlast';
import pressSearch from '../../crowd/lib/pressSearch';
import response from '../../libs/httpResponses/response';

const MAXIMUM_DATA_FETCHED_PER_PAGE = 500;
const UPDATE_STATUS_INTERVAL = 5000;
const SEARCH_CONCURRENCY = 20;
const BLAST_CONCURRENCY = 50;

export default async ({
  userId,
  title,
  searchParameters,
  message,
  appId,
  limit,
  operationId,
}) => {
  let currentLogBlast;
  try {
    currentLogBlast = await logBlast({
      id: operationId,
      userId,
      type: 'notification',
      parameters: searchParameters || {},
      limit,
      appId,
      content: { title, message },
    });

    // ----- Retrieves endpoints -----
    searchParameters = { ...(searchParameters || {}), hasNotification: true };
    const pipeline = buildPipeline(userId, appId, searchParameters || {});
    /* whole queueing system to process batch of mongo queries */
    let endpoints = [];
    const paginatorWorker = (queryStringParameters) => async () => {
      const localResults = await pressSearch(
        [...pipeline],
        appId,
        queryStringParameters
      );
      endpoints = endpoints.concat(
        flatten(localResults.crowd.map((fan) => fan.endpoints))
      );
    };
    const searchAndBlast = new PQueue({ concurrency: SEARCH_CONCURRENCY });
    const searchAndBlastTasks = [];

    /* Loop to iterate data in order to avoid size error from mongo */
    for (let i = 0; i * MAXIMUM_DATA_FETCHED_PER_PAGE < limit; i += 1) {
      ((page, batchProcessed) => {
        const localQS = {
          ...searchParameters,
          page,
          limit: Math.min(MAXIMUM_DATA_FETCHED_PER_PAGE, batchProcessed),
          filterUserInfo: false,
        };
        searchAndBlastTasks.push(paginatorWorker(localQS));
      })(i + 1, limit - i * MAXIMUM_DATA_FETCHED_PER_PAGE);
    }

    await searchAndBlast.addAll(searchAndBlastTasks);
    if (!endpoints.length) {
      await currentLogBlast.success({
        infos: 'Successfully sent notification to 0 of 0 recipients',
        stats: {
          sended: 0,
        },
      });
      return response({ code: 200 });
    }
    await currentLogBlast.prepared({ numRecipients: endpoints.length });
    // ----------

    const sendNotifications = queue(blastNotif, BLAST_CONCURRENCY);
    const results = [];
    let successfulBlast = 0;

    const updatePromises = [];
    const interval = setInterval(() => {
      updatePromises.push(currentLogBlast.update({ sended: successfulBlast }));
    }, UPDATE_STATUS_INTERVAL);

    endpoints.forEach((endpoint) => {
      sendNotifications.push({ title, endpoint, message }, (error, res) => {
        if (!error) successfulBlast += 1;
        results.push(error || res);
      });
    });

    await sendNotifications.drain();
    clearInterval(interval);
    await Promise.all(updatePromises);
    await currentLogBlast.success({
      infos: `Successfully sent notification to ${successfulBlast} of ${endpoints.length} recipients`,
      stats: {
        sended: successfulBlast,
      },
    });

    return response({ code: 200, body: results });
  } catch (e) {
    if (currentLogBlast) {
      await currentLogBlast.fails(e.message);
    }
    return response(errorMessage(e));
  }
};
