import get from 'lodash/get';
import iap from 'in-app-purchase';
import MongoClient from '../../libs/mongoClient';
import { addBalance } from '../../userBalances/lib/addBalance';
import response from '../../libs/httpResponses/response';
import articlePrices from '../../pressArticles/articlePrices.json';

const {
  COLL_APPS,
  DB_NAME,
  STAGE,
} = process.env;

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  const client = await MongoClient.connect();
  try {
    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    const appInfo = await client
      .db(DB_NAME)
      .collection(COLL_APPS)
      .findOne({ _id: appId }, {
        projection: {
          'builds.android.googleApiData': true,
          'settings.iap.appleSecret': true,
          'settings.iap.googleLicenceKey': true,
        },
      });

    if (!appInfo) {
      throw new Error('app_not_found');
    }

    const googleApiData = get(appInfo, 'builds.android.googleApiData');
    const applePassword = get(appInfo, 'settings.iap.appleSecret');
    const googleLicenceKey = get(appInfo, 'settings.iap.googleLicenceKey');
    const receiptRaw = get(bodyParsed, 'transaction.receipt');
    const appleReceipt = get(bodyParsed, 'transaction.appStoreReceipt');
    const googleReceipt = receiptRaw && JSON.parse(receiptRaw);

    if (
      !(appleReceipt && applePassword) &&
      !(googleReceipt && googleApiData && googleLicenceKey)
    ) {
      throw new Error('missing_arguments');
    }

    const {
      client_email: clientEmail,
      privateKey,
    } = googleApiData;

    const iapConfiguration = {
      requestDefaults: {},
      // For Apple and Google Play to force Sandbox validation only
      test: STAGE !== 'prod',
      // Output debug logs to stdout stream
      verbose: true,

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

    iap.config(iapConfiguration);

    await iap.setup();

    const validatedData = await iap.validate(
      appleReceipt || { data: googleReceipt, signature: bodyParsed.transaction.signature },
    );

    const options = {
      // Apple ONLY (for now...): purchaseData will NOT contain cancceled items
      ignoreCanceled: true,
      // purchaseData will NOT contain exipired subscription items
      ignoreExpired: true,
    };
    // validatedData contains sandbox: true/false for Apple and Amazon
    const [purchaseData] = iap.getPurchaseData(validatedData, options);
    // get only last part of productId (com.crowdaa.press.article_01 => article_01)
    const productId = purchaseData.productId.split('.').pop();

    const price = articlePrices[productId];
    // @TODO : checks if price is defined ?

    await addBalance(appId, userId, parseFloat(price));

    const responseBody = { ok: true, data: validatedData };
    return response({ code: 200, body: responseBody });
  } catch (e) {
    if (typeof e === 'string') {
      try {
        // eslint-disable-next-line no-ex-assign
        e = JSON.parse(e);
      } catch (error) {
        // eslint-disable-next-line no-ex-assign
        e = new Error('Can\'t parse error');
      }
    }
    return response({ code: 500, message: e.message });
  } finally {
    client.close();
  }
};
