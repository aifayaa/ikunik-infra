import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  APP_NOT_FOUND_CODE,
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_NOT_FOUND,
  INVALID_USERNAME_CODE,
} from '@libs/httpResponses/errorCodes';
import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import { escapeRegex, objGet } from '@libs/utils';

const { COLL_APPS } = mongoCollections;

type AppUserCheckParamsType = {
  appId: any;
};

type UsersUsernameFilterType = {
  type: 'text' | 'wildcard' | 'regex';
  sensitive?: boolean;
  match: string;
};

function isUsernameValid(
  username: string,
  userFilters: UsersUsernameFilterType[]
) {
  for (let { type, sensitive, match } of userFilters) {
    if (type === 'text') {
      if (sensitive) {
        if (username.indexOf(match) >= 0) {
          return false;
        }
      } else if (username.toLowerCase().indexOf(match.toLowerCase()) >= 0) {
        return false;
      }
    } else if (type === 'wildcard') {
      const matchExpr = match
        .split(/\*/g)
        .map((x) => escapeRegex(x))
        .join('.*');
      const expr = new RegExp(`^${matchExpr}$`, sensitive ? '' : 'i');
      if (username.match(expr)) {
        return false;
      }
    } else if (type === 'regex') {
      const expr = new RegExp(match, sensitive ? '' : 'i');
      if (username.match(expr)) {
        return false;
      }
    }
  }

  return true;
}

export async function appUserCheckUsername(
  username: string,
  { appId }: AppUserCheckParamsType
) {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const app = await db.collection(COLL_APPS).findOne({ _id: appId });
    if (!app) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND_CODE,
        'Application not found'
      );
    }

    const userFilters = objGet(
      app,
      ['settings', 'usersFilters', 'username'],
      []
    ) as UsersUsernameFilterType[];

    if (!isUsernameValid(username, userFilters)) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_ALLOWED,
        INVALID_USERNAME_CODE,
        'Invalid username, please use an other one'
      );
    }
  } finally {
    await client.close();
  }
}
