/* eslint-disable import/no-relative-packages */
import get from 'lodash/get';
import response from '../../libs/httpResponses/response.ts';
import { getArticle } from '../../pressArticles/lib/getArticle';
import meta from '../lib/meta';
import prepareNotifString from '../../pressArticles/lib/prepareNotifString';
import redirect from '../lib/redirect';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { APP_NAME_DEFAULT } = process.env;

const { COLL_APPS } = mongoCollections;

async function getApp(appName) {
  const client = await MongoClient.connect();
  const name = appName || APP_NAME_DEFAULT;

  try {
    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne(
        { name },
        {
          projection: {
            _id: 1,
            'builds.android.packageId': 1,
            'builds.android.name': 1,
            'builds.ios.iosAppId': 1,
            'builds.ios.name': 1,
            'credentials.facebook.appId': 1,
            'settings.webAppUrl': 1,
            protocol: 1,
          },
        }
      );
    if (!app) {
      throw new Error('app_not_found');
    }
    return app;
  } finally {
    client.close();
  }
}

export default async (event) => {
  try {
    const redirectUrl = (event.queryStringParameters || {}).redirect_url;
    const { appName } = event.queryStringParameters || {};
    const userAgent = event.headers['User-Agent'];
    const {
      _id: appId,
      builds,
      credentials,
      settings,
      protocol,
    } = await getApp(appName);
    const redirectResponse = redirect(
      userAgent,
      redirectUrl,
      appId,
      protocol,
      settings.webAppUrl
    );
    if (redirectResponse) {
      return redirectResponse;
    }
    const articleId = event.pathParameters.id;
    const article = await getArticle(articleId, appId, {
      getPictures: true,
      isServer: true,
    });
    if (!article) {
      throw new Error('article_not_found');
    }
    const picture = article.pictures[0] || {};
    const video = article.videos[0] || {};
    const previewUrl =
      (picture && picture.mediumUrl) || (video && video.thumbUrl) || '';
    const options = {
      height: picture.mediumHeight,
      width: picture.mediumWidth,
      url: redirectUrl,
      androidAppName: get(builds, 'android.name'),
      androidPackageId: get(builds, 'android.packageId'),
      iosAppName: get(builds, 'ios.name'),
      iosAppStoreId: get(builds, 'ios.iosAppId'),
      fbAppId: get(credentials, 'facebook.appId'),
    };
    const body = meta(
      article.title,
      prepareNotifString(article.plainText, 120),
      previewUrl,
      options
    );
    return response({
      code: 200,
      body,
      raw: true,
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (e) {
    let code;
    switch (e.message) {
      case 'article_not_found':
        code = 404;
        break;
      default:
        code = 500;
    }
    return response({ code, message: e.message });
  }
};
