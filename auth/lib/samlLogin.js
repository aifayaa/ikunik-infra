/* eslint-disable import/no-relative-packages */
import saml2 from 'saml2-js';
import request from 'request-promise-native';
import xmlParser from 'fast-xml-parser';
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS, COLL_SAML_LOGINS } = mongoCollections;

const { REACT_APP_API_URL } = process.env;

const samlDataCache = {};

export default async (apiKey, loginParameters) => {
  const client = await MongoClient.connect();

  try {
    const app = await client.db().collection(COLL_APPS).findOne({
      key: apiKey,
    });

    if (
      !apiKey ||
      !app ||
      !app.settings ||
      !app.settings.saml ||
      !app.settings.saml.idpConfig ||
      !app.settings.saml.spConfig
    ) {
      throw new Error('app_not_found');
    }

    const { _id: appId } = app;
    const { idpConfig, spConfig } = app.settings.saml;

    if (!samlDataCache[appId]) {
      const xmlData =
        idpConfig.metadataXml ||
        (await request.get({
          url: idpConfig.metadataUrl,
        }));
      const parsed = xmlParser.parse(xmlData, { ignoreAttributes: false });
      const certificates =
        parsed.EntityDescriptor.IDPSSODescriptor.KeyDescriptor.map(
          (kd) => kd['ds:KeyInfo']['ds:X509Data']['ds:X509Certificate']
        );
      const logoutLocation =
        parsed.EntityDescriptor.IDPSSODescriptor.SingleLogoutService[
          'https://identification-rec.experts-comptables.org/cas/idp/profile/SAML2/POST/SLO'
        ];
      const locations =
        parsed.EntityDescriptor.IDPSSODescriptor.SingleSignOnService.filter(
          (ssos) => {
            if (
              ssos['@_Binding'] ===
              'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect'
            ) {
              return true;
            }
            return false;
          }
        );
      const loginLocation = locations[0]['@_Location'];

      samlDataCache[appId] = {
        certificates,
        loginLocation,
        logoutLocation,
      };
    }

    const { certificates, loginLocation, logoutLocation } =
      samlDataCache[appId];

    // Little cleanup before each login, to avoid spam issues & database clogging
    await client
      .db()
      .collection(COLL_SAML_LOGINS)
      .deleteMany({ expiresAt: { $lt: new Date() } });

    const endpointUrl = new URL(`${REACT_APP_API_URL}/auth/saml/acscallback`);

    const spOptions = {
      entity_id: spConfig.entityId,
      private_key:
        spConfig.privateKey || 'some key content here, does not matter',
      certificate:
        spConfig.certificate || 'some cert content here, does not matter',
      assert_endpoint: endpointUrl.toString(),
      force_authn: true,
      auth_context: {
        comparison: 'exact',
        class_refs: ['urn:oasis:names:tc:SAML:1.0:am:password'],
      },
      nameid_format: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
      sign_get_request: false,
      allow_unencrypted_assertion: true,
    };

    // Call service provider constructor with options
    const sp = new saml2.ServiceProvider(spOptions);

    const idpOptions = {
      sso_login_url: loginLocation,
      sso_logout_url: logoutLocation,
      certificates,
    };
    const idp = new saml2.IdentityProvider(idpOptions);

    const [url, requestId] = await new Promise((resolve, reject) => {
      sp.create_login_request_url(idp, {}, (err, loginUrl, reqId) => {
        if (err) reject(err);
        else resolve([loginUrl, reqId]);
      });
    });

    const newSamlLoginData = {
      appId,
      expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      loginParameters,
      requestId,
    };
    await client.db().collection(COLL_SAML_LOGINS).insertOne(newSamlLoginData);

    return url;
  } finally {
    client.close();
  }
};
