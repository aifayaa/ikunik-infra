/* eslint-disable import/no-relative-packages */
import request from 'request-promise-native';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { AppType } from './appEntity';
import { getApp } from './appsUtils';
import random from '../../libs/account_utils/random';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  WORDPRESS_PLAYLISTS_NOT_SET_CODE,
} from '../../libs/httpResponses/errorCodes';
import { JWT } from 'jose';

const { COLL_APPS } = mongoCollections;

type EnvType = { PLAYLISTS_WORDPRESS_URL: string };
type JWTBaseType = {
  iat: number;
  exp: number;
  nbf?: number;
  iss?: string;
  aud?: string;
  sub?: string;
};

const { PLAYLISTS_WORDPRESS_URL } = process.env as EnvType;

export class WordpressPlaylistQueryManager {
  _app: AppType;
  readonly EXPIRES_DELAY = 600;

  constructor(app: AppType) {
    if (!app.credentials || !app.credentials.wordpressPlaylists) {
      throw new CrowdaaError(
        ERROR_TYPE_INTERNAL_EXCEPTION,
        WORDPRESS_PLAYLISTS_NOT_SET_CODE,
        `The application '${app._id}' has no wordpress playlists set`
      );
    }
    this._app = app;
  }

  get app() {
    return this._app;
  }

  async ensureTokenValidity() {
    if (!this._app.credentials || !this._app.credentials.wordpressPlaylists) {
      throw new CrowdaaError(
        ERROR_TYPE_INTERNAL_EXCEPTION,
        WORDPRESS_PLAYLISTS_NOT_SET_CODE,
        `The application '${this._app._id}' has no wordpress playlists set`
      );
    }

    const { sessionToken, username, password, baseUrl } =
      this._app.credentials.wordpressPlaylists;

    const jwtSettings = JWT.decode(sessionToken) as JWTBaseType;

    const expiredAfter = Date.now() / 1000 - this.EXPIRES_DELAY;
    if (!jwtSettings.exp || jwtSettings.exp >= expiredAfter) {
      const params = {
        method: 'POST',
        uri: `${baseUrl}/custom/v1/token`,
        headers: {},
        json: {
          username,
          password,
        },
      };

      let response = await request(params);

      if (typeof response === 'string') {
        response = JSON.parse(response);
      }

      const { token, autologin_code, autologin_url } = response;

      const client = await MongoClient.connect();

      const db = client.db();

      await db.collection(COLL_APPS).updateOne(
        { _id: this._app._id },
        {
          $set: {
            'credentials.wordpressPlaylists': {
              sessionToken: token,
              autoLoginToken: autologin_code,
            },
            'settings.playlistManagementUrl': autologin_url,
          },
        }
      );

      await client.close();

      this._app.credentials.wordpressPlaylists.sessionToken = token;
      this._app.credentials.wordpressPlaylists.autoLoginToken = autologin_code;
      this._app.settings.playlistManagementUrl = autologin_url;
    }
  }

  async getPlaylists() {
    if (!this._app.credentials || !this._app.credentials.wordpressPlaylists) {
      throw new CrowdaaError(
        ERROR_TYPE_INTERNAL_EXCEPTION,
        WORDPRESS_PLAYLISTS_NOT_SET_CODE,
        `The application '${this._app._id}' has no wordpress playlists set`
      );
    }

    const { sessionToken, baseUrl } = this._app.credentials.wordpressPlaylists;

    const params = {
      method: 'GET',
      uri: `${baseUrl}/custom/v1/user-playlists`,
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    };

    let response = await request(params);

    if (typeof response === 'string') {
      response = JSON.parse(response);
    }

    return response;
  }
}

async function createPlaylistUrl(app: AppType) {
  if (!app.credentials || !app.credentials.wordpressPlaylists) {
    const username = app._id;
    const password = random.secret(63);
    const email = `admin+${app._id}@crowdaa.com`;

    const params = {
      method: 'POST',
      uri: `${PLAYLISTS_WORDPRESS_URL}/custom/v1/register`,
      headers: {},
      json: {
        username,
        password,
        email,
      },
    };

    let response = await request(params);

    if (typeof response === 'string') {
      response = JSON.parse(response);
    }

    const { token, autologin_code, autologin_url } = response;

    const client = await MongoClient.connect();

    const db = client.db();

    await db.collection(COLL_APPS).updateOne(
      { _id: app._id },
      {
        $set: {
          'credentials.wordpressPlaylists': {
            baseUrl: PLAYLISTS_WORDPRESS_URL,
            username,
            password,
            email,
            sessionToken: token,
            autoLoginToken: autologin_code,
          },
          'settings.playlistManagementUrl': autologin_url,
        },
      }
    );

    await client.close();

    if (!app.credentials) app.credentials = {};
    app.credentials.wordpressPlaylists = {
      baseUrl: PLAYLISTS_WORDPRESS_URL,
      username,
      password,
      email,
      sessionToken: token,
      autoLoginToken: autologin_code,
    };
    app.settings.playlistManagementUrl = autologin_url;

    return app;
  } else {
    const manager = new WordpressPlaylistQueryManager(app);

    await manager.ensureTokenValidity();

    return manager.app;
  }
}

export default async (appId: string) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const app = await getApp(appId);

    if (app.settings.playlistManagementUrl) {
      return app;
    }

    const updatedApp = await createPlaylistUrl(app);

    return updatedApp;
  } finally {
    await client.close();
  }
};
