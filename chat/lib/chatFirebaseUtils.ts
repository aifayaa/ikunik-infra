import admin, { AppOptions } from 'firebase-admin';

const { FIREBASE_CHAT_SERVICE_ACCOUNT } = process.env as {
  FIREBASE_CHAT_SERVICE_ACCOUNT: string;
};

export function getServiceAccount() {
  /*
   * Because of a stupid serverless feature, we need to prefix this var with something (here "JSON:") so that it's not decoded as JSON by serverless itself, which would make it crash in our case...
   * See : https://github.com/serverless/serverless/issues/11289
   */
  const serviceAccount = JSON.parse(FIREBASE_CHAT_SERVICE_ACCOUNT.substring(5));

  return serviceAccount;
}

// Function to get or create a Firebase app with a specific name/identifier
export function getFirebaseApp(appId: string, config: AppOptions) {
  try {
    return admin.app(appId);
  } catch (error) {
    return admin.initializeApp(config, appId);
  }
}
