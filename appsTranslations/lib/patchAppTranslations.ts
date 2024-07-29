/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.js';
import mongoCollections from '../../libs/mongoCollections.json';
import { objGet } from '../../libs/utils.js';
import { getApp } from '../../apps/lib/appsUtils.js';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.js';
import {
  APP_NOT_FOUND_CODE,
  ERROR_TYPE_NOT_FOUND,
} from '../../libs/httpResponses/errorCodes.js';

const { COLL_APPS } = mongoCollections;

export const APPS_LANGS = ['en', 'fr'];

export type APPS_LANGS_TYPE = 'en' | 'fr';

type TranslationUpdates = {
  [key in APPS_LANGS_TYPE]: {
    [key: string]: string | null;
  };
};

type AssociativeStringsArray = {
  [key: string]: string;
};

export default async (appId: string, updates: TranslationUpdates) => {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const app = await getApp(appId);

    if (!app) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND_CODE,
        `The application '${appId}' is not found`,
        {
          details: {
            appId,
          },
        }
      );
    }

    let sets = false;
    let unsets = false;
    const $set = {} as AssociativeStringsArray;
    const $unset = {} as AssociativeStringsArray;

    Object.keys(updates).forEach((lang) => {
      Object.keys(updates[lang as APPS_LANGS_TYPE]).forEach((key) => {
        const value = updates[lang as APPS_LANGS_TYPE][key as string];
        if (value) {
          $set[`settings.press.intl.${lang}.${key}`] = value;
          sets = true;
        } else {
          $unset[`settings.press.intl.${lang}.${key}`] = '';
          unsets = true;
        }
      });
    });

    if (sets || unsets) {
      const updates = {} as {
        $set: AssociativeStringsArray | undefined;
        $unset: AssociativeStringsArray | undefined;
      };
      if (sets) updates.$set = $set;
      if (unsets) updates.$unset = $unset;

      await db.collection(COLL_APPS).updateOne({ _id: appId }, updates);

      const updatedApp = await getApp(appId);

      return updatedApp;
    } else {
      return app;
    }
  } finally {
    client.close();
  }
};
