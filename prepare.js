#!/usr/bin/env node

const STAGE = process.argv.pop();
const AVAILABLE_STAGES = ['dev', 'prod', 'awaxDev', 'awax'];

if (!(AVAILABLE_STAGES.indexOf(STAGE) + 1)) {
  // eslint-disable-next-line no-console
  console.log('usage : ./prepare.js [STAGE]\n  STAGE can be dev, prod, awaxDev, awax');
  process.exit(-1);
}

const fs = require('fs');
const yaml = require('js-yaml');
const { MongoClient } = require('./index');

(async () => {
  const apiServerlessConfig = fs.readFileSync('./api-v1/serverless.yml', 'utf8');
  const envConfig = fs.readFileSync('./env.yml', 'utf8');
  const apiServerlessData = yaml.safeLoad(apiServerlessConfig);
  const envData = yaml.safeLoad(envConfig);

  const mongoUrl = apiServerlessData.custom.mongoDB[STAGE];

  const promises = [];
  const client = await MongoClient.connect(mongoUrl);

  try {
    const {
      COLL_USERS,
      DB_NAME,
    } = envData;

    /* Those indexes are from meteor */
    promises.push(
      client.db(DB_NAME).collection(COLL_USERS)
        .createIndex('username', { unique: true, sparse: true }),
    );
    promises.push(
      client.db(DB_NAME).collection(COLL_USERS)
        .createIndex('emails.address', { unique: true, sparse: true }),
    );
    promises.push(
      client.db(DB_NAME).collection(COLL_USERS)
        .createIndex('services.resume.loginTokens.hashedToken', { unique: true, sparse: true }),
    );
    promises.push(
      client.db(DB_NAME).collection(COLL_USERS)
        .createIndex('services.resume.loginTokens.token', { unique: true, sparse: true }),
    );
    promises.push(
      client.db(DB_NAME).collection(COLL_USERS)
        .createIndex('services.resume.haveLoginTokensToDelete', { sparse: true }),
    );
    promises.push(
      client.db(DB_NAME).collection(COLL_USERS)
        .createIndex('services.resume.loginTokens.when', { sparse: true }),
    );
    promises.push(
      client.db(DB_NAME).collection(COLL_USERS)
        .createIndex('services.password.reset.when', { sparse: true }),
    );

    const results = await Promise.all(promises);

    // eslint-disable-next-line no-console
    console.log(results);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e.message);
  } finally {
    client.close();
  }
})();
