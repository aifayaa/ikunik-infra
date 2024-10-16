/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  APP_NOT_FOUND_CODE,
  DIFFERENT_BACKEND_TYPE_ALREADY_SET_CODE,
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_NOT_FOUND,
} from '@libs/httpResponses/errorCodes';

const { COLL_APPS } = mongoCollections;

type PluginAutoSetupActionType = 'setup' | 'logout';

type PluginAutoSetupParamsType = {
  action: PluginAutoSetupActionType;
  pluginApiKey: string;
  wordpressApiUrl: string;
  defaultWordpressUrl?: string;
  syncDomainNames?: string[];
};

const BACKEND_TYPE = 'wordpress';

export default async (
  appId: string,
  {
    action,
    pluginApiKey,
    wordpressApiUrl,
    defaultWordpressUrl,
    syncDomainNames,
  }: PluginAutoSetupParamsType
) => {
  const client = await MongoClient.connect();
  try {
    if (action === 'setup') {
      const app = await client
        .db()
        .collection(COLL_APPS)
        .findOne({ _id: appId });
      if (!app) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_FOUND,
          APP_NOT_FOUND_CODE,
          `Application with ID ${appId} not found`
        );
      }

      const $set: Record<string, any> = {
        'backend.type': BACKEND_TYPE,
        'backend.apiKey': pluginApiKey,
        'backend.url': wordpressApiUrl,
      };
      if (syncDomainNames) {
        $set['public.autoLoginDomains'] = syncDomainNames;
      }
      if (defaultWordpressUrl) {
        $set['public.defaultUrl'] = defaultWordpressUrl;
      }

      if (!app.backend) {
        await client
          .db()
          .collection(COLL_APPS)
          .updateOne(
            { _id: appId, backend: { $exists: false } },
            {
              $set,
            }
          );
      } else if (app.backend.type === BACKEND_TYPE) {
        await client.db().collection(COLL_APPS).updateOne(
          { _id: appId, 'backend.type': BACKEND_TYPE },
          {
            $set,
          }
        );
      } else {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          DIFFERENT_BACKEND_TYPE_ALREADY_SET_CODE,
          `A backend of type ${app.backend.type} is already set`
        );
      }
    } /* action = 'logout' */ else {
      await client
        .db()
        .collection(COLL_APPS)
        .updateOne(
          {
            _id: appId,
            'backend.type': BACKEND_TYPE,
            'backend.apiKey': pluginApiKey,
            'backend.url': wordpressApiUrl,
          },
          {
            $unset: { backend: '' },
          }
        );
    }

    return { ok: true };
  } finally {
    client.close();
  }
};
