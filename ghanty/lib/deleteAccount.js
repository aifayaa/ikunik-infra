/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import { MyFidApi } from '../../libs/backends/ghanty-myfid';
import MetricsTimer from './metricsTimer';
import response from '../../libs/httpResponses/response.ts';
import { formatResponseBody } from '../../libs/httpResponses/formatResponseBody.ts';
import { ERROR_TYPE_FOREIGN_API } from '../../libs/httpResponses/errorCodes.ts';
import deleteUser from '../../users/lib/deleteUser';
import { getApp } from '../../apps/lib/appsUtils.ts';
import { getUser } from '../../users/lib/usersUtils.ts';

export default async (appId, userId) => {
  const client = await MongoClient.connect();
  const metricsTimer = new MetricsTimer(__filename.replace(/.*\//, ''));

  try {
    const app = await getApp(appId);
    const user = await getUser(userId);

    const fidApi = new MyFidApi(app);
    metricsTimer.start();
    await fidApi.renewLoginTokenIfNeeded(client);
    metricsTimer.print('renewLoginTokenIfNeeded');

    metricsTimer.start();

    let fidResponse;
    const ghantyResponse = await fidApi.callFetchRaw(
      `/users/${user.username}`,
      {
        method: 'DELETE',
      }
    );

    metricsTimer.print(`DELETE /users/${user.username}`);

    if (ghantyResponse.status === 200) {
      fidResponse = {
        items: {
          deletedResources: {
            userIds: [userId],
            ghantyUserIds: [user.username],
          },
        },
      };

      await deleteUser(userId, appId);

      return response({
        code: 200,
        body: formatResponseBody({
          data: fidResponse,
        }),
      });
    } else {
      const errors = [
        {
          type: ERROR_TYPE_FOREIGN_API,
          code: ghantyResponse.status,
          message: ghantyResponse.statusText,
          details: { url: ghantyResponse.url },
        },
      ];

      return response({
        code: 200,
        body: formatResponseBody({
          errors,
        }),
      });
    }
  } catch (exception) {
    if (exception.constructor.name !== 'FetchError') {
      throw exception;
    }

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

    return response({
      code: 200,
      body: formatResponseBody({
        errors,
      }),
    });
  } finally {
    await metricsTimer.save(client);
    client.close();
  }
};
