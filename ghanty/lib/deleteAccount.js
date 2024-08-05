/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { MyFidApi } from '../../libs/backends/ghanty-myfid';
import MetricsTimer from './metricsTimer';
import response, {
  handleException,
} from '../../libs/httpResponses/response.ts';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import { ERROR_TYPE_FOREIGN_API } from '../../libs/httpResponses/errorCodes.ts';
import deleteUser from '../../users/lib/deleteUser';

const { COLL_APPS, COLL_USERS } = mongoCollections;

export default async (appId, userId) => {
  const client = await MongoClient.connect();
  const metricsTimer = new MetricsTimer(__filename.replace(/.*\//, ''));
  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId });
    console.log('userId', userId);
    if (!app) {
      throw new Error('app_not_found');
    }
    console.log('PASS 0');
    if (!user) {
      throw new Error('user_not_found');
    }
    console.log('PASS 1');
    const fidApi = new MyFidApi(app);
    metricsTimer.start();
    console.log('PASS 2');
    await fidApi.renewLoginTokenIfNeeded(client);
    console.log('PASS 3');
    metricsTimer.print('renewLoginTokenIfNeeded');

    console.log('PASS 4');
    metricsTimer.start();
    // const fidResponse = await fidApi.call(`/users/${user.username}`, {
    //   method: 'DELETE',
    // });
    // const fidResponse = await fidApi.callFetchRaw(`/users/${user.username}`, {
    //   method: 'DELETE',
    // });
    let fidResponse;
    try {
      const ghantyResponse = await fidApi.callFetchRaw(
        `/users/${user.username}`,
        {
          method: 'DELETE',
        }
      );
      console.log('ghantyResponse', ghantyResponse);
      console.log(
        'ghantyResponse.constructor.name',
        ghantyResponse.constructor.name
      );

      fidResponse = {
        items: {
          deletedResources: {
            userIds: [userId],
            ghantyUserIds: [user.username],
          },
        },
      };

      metricsTimer.print(`DELETE /users/${user.username}`);

      // TODO to uncomment
      await deleteUser(userId, appId);

      return response({
        code: 200,
        body: formatResponseBody({
          data: fidResponse,
        }),
      });

      // if (ghantyResponse.status === 200) {
      //   fidResponse = {
      //     items: {
      //       deletedResources: {
      //         userIds: [userId],
      //         ghantyUserIds: [user.username],
      //       },
      //     },
      //   };

      //   metricsTimer.print(`DELETE /users/${user.username}`);

      //   // TODO to uncomment
      //   // await deleteUser(userId, appId);

      //   return response({
      //     code: 200,
      //     body: formatResponseBody({
      //       data: fidResponse,
      //     }),
      //   });
      // } else {
      //   const error = {
      //     details: ghantyResponse,
      //   };
      //   return response({
      //     code: 200,
      //     body: formatResponseBody({
      //       error,
      //     }),
      //   });
      // }
    } catch (exception) {
      metricsTimer.print(`DELETE /users/${user.username}`);

      console.log('Is EXCEPTION');
      console.log('exception.constructor.name', exception.constructor.name);
      if (exception.constructor.name !== 'FetchError') {
        throw exception;
      }

      console.log('exception.status', exception.status);
      if (!exception.status) {
        throw exception;
      }

      const errors = [
        {
          type: ERROR_TYPE_FOREIGN_API,
          code: exception.statusCode,
          message: exception.statusMessage,
          details: { response: exception.response, data: exception.data },
        },
      ];

      console.log('errors', errors);
      return response({
        code: 200,
        body: formatResponseBody({
          errors,
        }),
      });

      // if (exception.status === 200) {
      //   const error = {
      //     type: ERROR_TYPE_FOREIGN_API,
      //     code: exception.statusCode,
      //     message: exception.statusMessage,
      //     details: { response: exception.response, data: exception.data },
      //   };

      //   return response({
      //     code: 200,
      //     body: formatResponseBody({
      //       error,
      //     }),
      //   });
      // } else {
      //   fidResponse = {
      //     items: {
      //       deletedResources: {
      //         userIds: [userId],
      //         ghantyUserIds: [user.username],
      //       },
      //     },
      //   };
      //   return response({
      //     code: 200,
      //     body: formatResponseBody({
      //       error: fidResponse,
      //     }),
      //   });
      //   throw exception;
      // }

      // console.log('exception.status', exception.status);

      // console.log('exception', exception);
      // if (exception.request) {
      // }
    }

    // console.log('fidResponse', fidResponse);
    // console.log('PASS 5');
    // metricsTimer.print(`DELETE /users/${user.username}`);

    // await deleteUser(userId, appId);

    // await metricsTimer.save(client);
    // console.log('PASS 6');

    // // return response;
    // return response({
    //   code: 200,
    //   body: formatResponseBody({
    //     data: fidResponse,
    //   }),
    // });
  } catch (exception) {
    console.log('typeof exception');
    console.log(typeof exception);
    console.log('exception.constructor.name');
    console.log(exception.constructor.name);
    console.log(exception);
    // console.dir(exception);

    if (exception.request) {
      console.log('exception.request', exception.request);
    }
    if (exception.options) {
      console.log('exception.options', exception.options);
    }
    if (exception.response) {
      console.log('exception.response', exception.response);
    }
    if (exception.data) {
      console.log('exception.data', exception.data);
    }
    if (exception.status) {
      console.log('exception.status', exception.status);
    }
    if (exception.statusText) {
      console.log('exception.statusText', exception.statusText);
    }
    if (exception.statusCode) {
      console.log('exception.statusCode', exception.statusCode);
    }
    if (exception.statusMessage) {
      console.log('exception.statusMessage', exception.statusMessage);
    }

    // eslint-disable-next-line no-console
    console.error('exception', exception);
    return handleException(exception);
  } finally {
    await metricsTimer.save(client);
    client.close();
  }
};
