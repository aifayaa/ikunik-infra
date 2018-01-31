import AWS from 'aws-sdk';
import shortid from 'shortid';
import { MongoClient } from 'mongodb';

AWS.config.update({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET,
});

const dynamoDB = new AWS.DynamoDB();

const doGetContacts = async (userId, { limit, skip }) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const opts = { limit: process.env.DEFAULT_LIMIT };
    if (limit) {
      opts.limit = limit | 0;
      if (opts.limit > process.env.LIMIT_MAX) throw new Error(`above ${process.env.LIMIT_MAX} contacts limit`);
    }
    if (skip) opts.skip = skip | 0;
    const contacts = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .find({ invitedByUserID: userId }, opts).toArray();
    return contacts;
  } finally {
    client.close();
  }
};

export const handleGetContacts = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { limit, skip } = event.queryStringParameters || {};
    const contacts = await doGetContacts(userId, { limit, skip });
    const response = {
      statusCode: 200,
      body: JSON.stringify(contacts),
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      message: e.message,
    };
    callback(null, response);
  }
};

const doImport = async ({ userId, contacts }) => {
  const putRequests = contacts.map(({
    firstname,
    lastname,
    phone,
    email,
  }) => ({
    PutRequest: {
      Item: {
        id: { S: shortid() },
        userId: { S: userId },
        firstname: { S: firstname },
        lastname: { S: lastname },
        phone: { S: phone },
        email: { S: email },
      },
    },
  }));

  const params = {
    RequestItems: {
      contacts: putRequests,
    },
  };
  await dynamoDB.batchWriteItem(params).promise();
};

export const handleImport = async (event, context, callback) => {
  try {
    const data = JSON.parse(event.body);
    await doImport(data);

    const response = { statusCode: 200 };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      message: e.message,
    };
    callback(null, response);
  }
};
