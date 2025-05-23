/* eslint-disable import/no-relative-packages */
import { AppType } from '@apps/lib/appEntity';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  APP_NOT_FOUND_CODE,
  ERROR_TYPE_NOT_FOUND,
  USER_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';
import { UserType } from '@users/lib/userEntity';
import admin, { AppOptions } from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';

const { FIREBASE_CHAT_SERVICE_ACCOUNT } = process.env as {
  FIREBASE_CHAT_SERVICE_ACCOUNT: string;
};

const { COLL_APPS, COLL_USERS } = mongoCollections;

// Function to get or create a Firebase app with a specific name
function getFirebaseApp(appName: string, config: AppOptions) {
  try {
    return admin.app(appName);
  } catch (error) {
    return admin.initializeApp(config, appName);
  }
}

export default async (userId: string, appId: string) => {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const [app, user]: [AppType | null, UserType | null] = await Promise.all([
      db.collection(COLL_APPS).findOne(
        {
          _id: appId,
        },
        {
          projection: {
            'credentials.firebase.config': 1,
          },
        }
      ),
      db.collection(COLL_USERS).findOne(
        {
          _id: userId,
          appId,
        },
        {
          projection: {
            'services.firebaseChat': 1,
          },
        }
      ),
    ]);

    if (!app) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND_CODE,
        `The app '${appId}' was not found`
      );
    }
    if (!user) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_NOT_FOUND_CODE,
        `The user '${userId}' was not found`
      );
    }

    if (!app.credentials || !app.credentials.firebase) {
      return {
        firebaseConfig: null,
        token: null,
      };
    }

    /*
     * Because of a stupid serverless feature, we need to prefix this var with something (here "JSON:") so that it's not decoded as JSON by serverless itself, which would make it crash in our case...
     * See : https://github.com/serverless/serverless/issues/11289
     */
    const serviceAccount = JSON.parse(
      FIREBASE_CHAT_SERVICE_ACCOUNT.substring(5)
    );

    const firebaseApp = getFirebaseApp(appId, {
      credential: admin.credential.cert(serviceAccount),
      storageBucket: app.credentials.firebase.config.storageBucket,
      projectId: app.credentials.firebase.config.projectId,
    });

    const auth = getAuth(firebaseApp);

    if (!user.services.firebaseChat) {
      await auth.createUser({
        uid: userId,
      });

      await db.collection(COLL_USERS).updateOne(
        {
          _id: userId,
          appId,
        },
        { $set: { 'services.firebaseChat.userCreated': true } }
      );
    }

    const token = await auth.createCustomToken(userId, { admin: false });

    await db.collection(COLL_USERS).updateOne(
      {
        _id: userId,
        appId,
      },
      {
        $set: {
          'services.firebaseChat.lastToken': { value: token, at: new Date() },
        },
      }
    );

    return {
      firebaseConfig: app.credentials.firebase.config,
      token,
    };
  } finally {
    client.close();
  }
};
