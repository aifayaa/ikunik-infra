/* eslint-disable import/no-relative-packages */
import get from 'lodash/get';
import iap from 'in-app-purchase';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import badgePrices from '../../userBadges/badgePrices.json';

const { STAGE } = process.env;

const { COLL_APPS } = mongoCollections;

export default async function validatePurchase(
  appId,
  body,
  { verbose = true } = {}
) {
  const client = await MongoClient.connect();
  try {
    const appInfo = await client
      .db()
      .collection(COLL_APPS)
      .findOne(
        { _id: appId },
        {
          projection: {
            'builds.android.googleApiData': true,
            'settings.iap.appleSecret': true,
            'settings.iap.googleLicenceKey': true,
          },
        }
      );

    if (!appInfo) {
      throw new Error('app_not_found');
    }

    const googleApiData = get(appInfo, 'builds.android.googleApiData');
    const applePassword = get(appInfo, 'settings.iap.appleSecret');
    const googleLicenceKey = get(appInfo, 'settings.iap.googleLicenceKey');
    const googleSubscriptionCredentials = get(
      appInfo,
      'settings.iap.googleSubscriptionCredentials'
    );
    const receiptRaw = get(body, 'transaction.receipt');
    const appleReceipt = get(body, 'transaction.appStoreReceipt');
    const googleReceipt = receiptRaw && JSON.parse(receiptRaw);

    if (
      !(appleReceipt && applePassword) &&
      !(googleReceipt && googleApiData && googleLicenceKey)
    ) {
      throw new Error('missing_arguments');
    }

    const { client_email: clientEmail, private_key: privateKey } =
      googleApiData || {};

    const iapConfiguration = {
      requestDefaults: {},
      // For Apple and Google Play to force Sandbox validation only
      test: STAGE === 'dev',
      // Output debug logs to stdout stream
      verbose,

      // googlePublicKeyPath
      googlePublicKeyStrLive: googleLicenceKey,
      // googlePublicKeyStrSandBox

      // Apple
      // if you want to exclude old transaction, set this to true. Default is false
      appleExcludeOldTransactions: true,
      // this comes from iTunes Connect (You need this to valiate subscriptions)
      applePassword,
    };
    // Optionnal fields for Google Play subscriptions
    // googleAccToken, googleRefToken, googleClientID, googleClientSecret

    if (clientEmail && privateKey) {
      iapConfiguration.googleServiceAccount = {
        clientEmail,
        privateKey,
      };
    }

    if (googleSubscriptionCredentials) {
      iapConfiguration.googleClientID =
        googleSubscriptionCredentials.googleClientID;
      iapConfiguration.googleClientSecret =
        googleSubscriptionCredentials.googleClientSecret;
      iapConfiguration.googleAccToken =
        googleSubscriptionCredentials.googleAccToken;
      iapConfiguration.googleRefToken =
        googleSubscriptionCredentials.googleRefToken;
    }

    const productId = `${body.id}`.split('.').pop();

    iap.config(iapConfiguration);

    await iap.setup();

    const validatedData = await iap.validate(
      appleReceipt || {
        ...googleReceipt,
        subscription: Boolean(productId && badgePrices[productId]),
      }
    );

    const options = {
      ignoreCanceled: false,
      ignoreExpired: false,
    };

    // validatedData contains sandbox: true/false for Apple and Amazon
    const [purchaseData] = iap.getPurchaseData(validatedData, options);

    const isValidated = iap.isValidated(validatedData);
    const isCanceled = iap.isCanceled(purchaseData);
    const isExpired = iap.isExpired(purchaseData);

    return {
      productId,
      isValidated,
      isCanceled,
      isExpired,
      validatedData,
      purchaseData,
    };
  } finally {
    await client.close();
  }
}
