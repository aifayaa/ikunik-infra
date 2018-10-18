import { MongoClient } from 'mongodb';
import Lambda from 'aws-sdk/clients/lambda';
import phone from 'phone';

const lambda = new Lambda({
  region: process.env.AWS_REGION,
});

const doGetContactList = async (userId, contactListId, {
  limit, skip, sortBy, sortOrder,
} = {}) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const opts = {};
    opts.limit = limit | 0;
    if (skip) opts.skip = skip;
    if (sortBy && sortOrder) opts.sort = { [sortBy]: (sortOrder === 'desc' ? 1 : -1) };

    let aggregation = [
      { $match: { UserId: userId } },
      {
        $lookup: {
          from: process.env.COLL_NAME,
          localField: '_id',
          foreignField: 'profil_ID',
          as: 'list',
        },
      },
      {
        $unwind: {
          path: '$list',
          preserveNullAndEmptyArrays: false,
        },
      },
      { $match: { 'list._id': contactListId } },
      {
        $unwind: {
          path: '$list.contactIDs',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'contacts',
          localField: 'list.contactIDs',
          foreignField: '_id',
          as: 'contact',
        },
      },
    ];
    if (opts.sort) aggregation.push({ $sort: opts.sort });
    if (opts.skip) aggregation.push({ $skip: opts.skip });
    if (opts.limit) aggregation.push({ $limit: opts.limit });
    aggregation = aggregation.concat([{
      $unwind: {
        path: '$contact',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: '$list._id',
        contacts: { $addToSet: '$contact' },
        contactListName: { $first: '$list.contactListName' },
        date: { $first: '$list.date' },
        profil_ID: { $first: '$list.profil_ID' },
        type: { $first: '$list.type' },
        user_ID: { $first: '$list.user_ID' },
      },
    }]);
    const contactList = await client.db(process.env.DB_NAME).collection('profil')
      .aggregate(aggregation).toArray();
    return contactList[0];
  } finally {
    client.close();
  }
};

export const handleBlastContactListEmail = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const contactListId = event.pathParameters.id;
    const { subject, template } = JSON.parse(event.body);
    let { contacts } = await doGetContactList(userId, contactListId);
    contacts = contacts.map(contact => ({ email: contact.email, name: contact.name }))
      .filter(contact => contact.email);
    const params = {
      FunctionName: `blast-${process.env.STAGE}-blastEmail`,
      Payload: JSON.stringify({
        contacts,
        subject,
        template,
        opts: { userId, listId: contactListId },
      }),
    };
    const res = await lambda.invoke(params).promise();
    const response = {
      statusCode: 200,
      body: JSON.stringify(res),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};

export const handleBlastContactListText = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const contactListId = event.pathParameters.id;
    const { message } = JSON.parse(event.body);
    const { contacts } = await doGetContactList(userId, contactListId);
    const phones = contacts.map(contact => phone(contact.phone || contact.cleandedPhoneNumber)[0])
      .filter(phoneNumber => phoneNumber);
    const params = {
      FunctionName: `blast-${process.env.STAGE}-blastText`,
      Payload: JSON.stringify({
        phones,
        message,
        opts: { userId, listId: contactListId },
      }),
    };
    const res = await lambda.invoke(params).promise();
    const response = {
      statusCode: 200,
      body: JSON.stringify(res),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};

export const handleGetContactList = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const contactListId = event.pathParameters.id;
    const {
      limit, skip, sortBy, sortOrder,
    } = event.queryStringParameters || {};
    const results = await doGetContactList(userId, contactListId, {
      limit, skip, sortBy, sortOrder,
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
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
