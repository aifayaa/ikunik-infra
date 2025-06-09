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
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseApp, getServiceAccount } from './chatFirebaseUtils';
import { ChatUserType } from './chatEntities';

const { FIREBASE_CHAT_SERVICE_ACCOUNT } = process.env as {
  FIREBASE_CHAT_SERVICE_ACCOUNT: string;
};

const { COLL_APPS, COLL_USERS } = mongoCollections;

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
            profile: 1,
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

    const serviceAccount = getServiceAccount();

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

    const fsdb = getFirestore(firebaseApp);
    const chatUserData: ChatUserType = {
      updatedAt: new Date(),
      profile: user.profile,
    };
    await fsdb.collection('users').doc(userId).set(chatUserData);

    return {
      firebaseConfig: app.credentials.firebase.config,
      token,
    };
  } finally {
    client.close();
  }
};
