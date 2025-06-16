import { AppType } from '@apps/lib/appEntity';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  CHAT_NOT_CONFIGURED_CODE,
  ERROR_TYPE_SETUP,
} from '@libs/httpResponses/errorCodes';
import admin from 'firebase-admin';

// Function to get or create a Firebase app with a specific name/identifier
export function getFirebaseApp(app: AppType) {
  try {
    return admin.app(app._id);
  } catch (error) {
    if (!app?.credentials?.firebase) {
      throw new CrowdaaError(
        ERROR_TYPE_SETUP,
        CHAT_NOT_CONFIGURED_CODE,
        `The app '${app._id}' is not configured`
      );
    }
    return admin.initializeApp(
      {
        credential: admin.credential.cert(
          // We do not respect this shape, but it still works, so ignore typescript warning... :
          app.credentials.firebase.serviceAccount as admin.ServiceAccount
        ),
        storageBucket: app.credentials.firebase.config.storageBucket,
        projectId: app.credentials.firebase.config.projectId,
      },
      app._id
    );
  }
}
