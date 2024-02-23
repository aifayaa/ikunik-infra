import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { MyFidApi } from '../../libs/backends/ghanty-myfid';
import MetricsTimer from './metricsTimer';
import login from './login';

const {
  COLL_APPS,
} = mongoCollections;

export default async (
  appId,
  {
    // Required :
    password, // : password123*
    phone, // : 0692000000
    email, // : benjamin@test.net
    firstName, // : BenjaminTest
    lastName, // : METROTEST

    // Optionnal :
    civility, // : Monsieur / Madame
    address1, // : 123 rue du magasin
    city, // : Le Tampon
    postalCode, // : 97430
    country, // : Réunion
    consentToCGV = 1, // : 0 / 1
  },
) => {
  const client = await MongoClient.connect();
  const metricsTimer = new MetricsTimer(__filename.replace(/.*\//, ''));
  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    if (!app) {
      throw new Error('app_not_found');
    }
    const fidApi = new MyFidApi(app);
    metricsTimer.start();
    await fidApi.renewAPITokenIfNeeded(client);
    metricsTimer.print('renewAPITokenIfNeeded');

    metricsTimer.start();
    const registerResp = await fidApi.call('/register', {
      method: 'POST',
      body: {
        'new-password': password,
        'confirm-password': password,
        phone,
        email,
        first_name: firstName,
        last_name: lastName,
        civility,
        address1,
        city,
        postal_code: postalCode,
        country,
        consent_type_CGV: consentToCGV,
      },
    });
    metricsTimer.print('POST register', { phone, email, firstName, lastName });

    await metricsTimer.save(client);

    let loginResp = null;
    try {
      loginResp = await login(email, password, appId);
    } catch (e) {
      loginResp = { error: `${e}` };
    }

    return ({ register: registerResp, login: loginResp });
  } finally {
    client.close();
  }
};
