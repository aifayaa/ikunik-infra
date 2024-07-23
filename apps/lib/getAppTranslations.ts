/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.js';
import mongoCollections from '../../libs/mongoCollections.json';
import { objGet } from '../../libs/utils.js';
import { getApp } from './appsUtils';

const { COLL_USERS } = mongoCollections;

export default async (appId: string) => {
  const client = await MongoClient.connect();

  try {
    const app = await getApp(appId);

    return objGet(app, ['settings', 'press', 'intl'], {});
  } finally {
    client.close();
  }
};
