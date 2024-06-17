/* eslint-disable import/no-relative-packages */
import { getApp } from './appsUtils';
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  WORDPRESS_PLAYLISTS_NOT_SET_CODE,
} from '../../libs/httpResponses/errorCodes';
import { WordpressPlaylistQueryManager } from './postAppsIdActivateWPPlaylists';

export default async (appId: string) => {
  const app = await getApp(appId);

  if (!app.credentials || !app.credentials.wordpressPlaylists) {
    throw new CrowdaaError(
      ERROR_TYPE_INTERNAL_EXCEPTION,
      WORDPRESS_PLAYLISTS_NOT_SET_CODE,
      `The application '${app._id}' has no wordpress playlists set`
    );
  }

  const manager = new WordpressPlaylistQueryManager(app);

  const playlists = await manager.getPlaylists();

  return playlists;
};
