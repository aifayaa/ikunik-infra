import AWS from 'aws-sdk';
import shortid from 'shortid';
import { MongoClient } from 'mongodb';
import winston from 'winston';

AWS.config.update({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET,
});

const dynamoDB = new AWS.DynamoDB();

const doGetContacts = async (userId, {
  idsOnly, filter, limit, search, skip, sortBy, sortOrder, type,
}) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const profile = await client.db(process.env.DB_NAME).collection('profil').findOne({
      UserId: userId,
    });
    const selector = {
      invitedByProfil_ID: profile._id,
    };
    // FIXME: $text need complete words, regex slow performances
    // if (search) selector.$text = { $search: search };
    if (search) {
      selector.$or = [
        { firstname: { $regex: search, $options: 'i' } },
        { lastname: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { cleandedPhoneNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (type === 'email') selector.email = { $exists: true };
    if (type === 'text') selector.cleandedPhoneNumber = { $exists: true };
    if (filter) {
      const contactIDs = JSON.parse(decodeURIComponent(filter));
      selector._id = { $in: contactIDs };
    }
    const opts = {};
    if (idsOnly) {
      opts.fields = { _id: 1 };
    } else {
      opts.limit = process.env.DEFAULT_LIMIT | 0;
      if (limit) {
        opts.limit = limit | 0;
        if (opts.limit > process.env.LIMIT_MAX | 0) throw new Error(`above ${process.env.LIMIT_MAX} contacts limit`);
      }
      if (skip) opts.skip = skip | 0;
      if (sortBy && sortOrder) opts.sort = { [sortBy]: (sortOrder === 'desc' ? 1 : -1) };
    }
    const [contacts, totalCount] = await Promise.all([
      client.db(process.env.DB_NAME).collection(process.env.COLL_NAME).find(selector, opts)
        .toArray(),
      client.db(process.env.DB_NAME).collection(process.env.COLL_NAME).find(selector, opts).count(),
    ]);
    return { contacts, totalCount };
  } finally {
    client.close();
  }
};

export const handleGetContacts = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    winston.info(userId, event.queryStringParameters);
    const {
      idsOnly, filter, limit, search, skip, sortBy, sortOrder, type,
    } = event.queryStringParameters || {};
    const results = await doGetContacts(userId, {
      idsOnly, filter, limit, search, skip, sortBy, sortOrder, type,
    });
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    winston.error(e);
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
