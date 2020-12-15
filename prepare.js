#!/usr/bin/env node

const STAGE = process.argv.pop();
const AVAILABLE_STAGES = ['dev', 'preprod', 'prod', 'awaxDev', 'awax'];

if (!(AVAILABLE_STAGES.indexOf(STAGE) + 1)) {
  // eslint-disable-next-line no-console
  console.log('usage : ./prepare.js [STAGE]\n  STAGE can be dev, prod, awaxDev, awax');
  process.exit(-1);
}

const fs = require('fs');
const nodemailer = require('nodemailer');
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

  const {
    AUTH_PASS: pass,
    AUTH_SMTP: host,
    AUTH_USER: user,
    COLL_USERS,
    DB_NAME,
  } = envData;

  try {
    promises.push(
      client.db(DB_NAME).collection(COLL_USERS)
        .createIndex({ username: 1, appIds: 1 }, { unique: true, sparse: true }),
    );
    promises.push(
      client.db(DB_NAME).collection(COLL_USERS)
        .createIndex({ 'emails.address': 1, appIds: 1 }, { unique: true, sparse: true }),
    );

    /* Those indexes are from meteor */
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

    await Promise.all(promises);
  } catch (indexError) {
    try {
      const transporter = nodemailer.createTransport({
        auth: { user, pass },
        host,
        port: 465,
        secure: true,
      });
      await transporter.sendMail({
        from: 'services@crowdaa.com',
        html: indexError.message,
        subject: 'MS Prepare failed',
        to: 'prod@crowdaa.com',
      });
    } catch (mailingError) {
      // eslint-disable-next-line no-console
      console.error(mailingError.message);
    }
  } finally {
    client.close();
  }
})();
