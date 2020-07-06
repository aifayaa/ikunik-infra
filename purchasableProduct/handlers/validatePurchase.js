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
      .findOne({ _id: appId });

    if (!appInfo) {
      throw new Error('app_not_found');
    }

    const googleApiData = get(appInfo, 'builds.android.googleApiData');
    const receiptRaw = get(bodyParsed, 'transaction.receipt');

    if (!googleApiData || !receiptRaw) {
      throw new Error('missing_arguments');
    }

    const receipt = JSON.parse(receiptRaw);

    const {
      client_email: clientEmail,
      privateKey,
    } = googleApiData;

    const iapConfiguration = {
      requestDefaults: {},
      // For Apple and Googl Play to force Sandbox validation only
      test: STAGE !== 'prod',
      // Output debug logs to stdout stream
      verbose: true,

      // googlePublicKeyPath
      googlePublicKeyStrLive: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAhTz0I9dusZ2HDHHnJasg/cyaKI88duaHQPZkQC7tLxCt1tKarFf/01G9CUjA9o6AnnoSYgoHIXvcczEls4LhYJtoH2QgKnJyBRmVD9FszJWebjpugX7aMOy2Sn53WZCGvsz68wEWc8+bL51oEvZUayg8p8+2XBKZ7jyCH18oYCIalIDoXMnmXPphptk9XoNrkJSZG6hFRIwj7ts3NIsNMB94tGISlNzX89ZwEPsI5qtq988++HAaJW4bz8oRX3U1n9aPDs2Ctm1nZvaCoXIFi0/nif0qXXfoB+AlVch8VizC4D7o6WgtGpKHENVncCzhzx0pq3g3Vw6eKtO8Lyi63wIDAQAB',
      // googlePublicKeyStrSandBox
    };
    // Optionnal fields for Google Play subscriptions
    // googleAccToken, googleRefToken, googleClientID, googleClientSecret

    // if (applePassword) {
    //   // if you want to exclude old transaction, set this to true. Default is false
    //   iapConfiguration.appleExcludeOldTransactions = true;
    //   // this comes from iTunes Connect (You need this to valiate subscriptions)
    //   iapConfiguration.applePassword = applePassword;
    // }

    if (clientEmail && privateKey) {
      iapConfiguration.googleServiceAccount = {
        clientEmail,
        privateKey,
      };
    }

    iap.config(iapConfiguration);

    await new Promise((resolve, reject) => {
      iap.setup()
        .then(() => resolve())
        .catch((error) => reject(new Error(error)));
    });

    const validatedData = await new Promise((resolve, reject) => {
      iap.validate({ data: receipt, signature: bodyParsed.transaction.signature })
        .then((data) => resolve(data))
        .catch((error) => reject(new Error(error)));
    });

    const options = {
      // Apple ONLY (for now...): purchaseData will NOT contain cancceled items
      ignoreCanceled: true,
      // purchaseData will NOT contain exipired subscription items
      ignoreExpired: true,
    };
    // validatedData contains sandbox: true/false for Apple and Amazon
    const [purchaseData] = iap.getPurchaseData(validatedData, options);

    const price = articlePrices[purchaseData.productId];
    // @TODO : checks if price is defined ?

    await addBalance(appId, userId, parseFloat(price));

    const responseBody = { ok: true, data: validatedData };
    return response({ code: 200, body: responseBody });
  } catch (e) {
    return response({ code: 500, message: e.message });
  } finally {
    client.close();
  }
};
