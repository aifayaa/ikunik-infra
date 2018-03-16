import { MongoClient } from 'mongodb';

const doGetContactList = async (userId, contactListId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const contactList = await client.db(process.env.DB_NAME).collection('profil')
      .aggregate([
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
            preserveNullAndEmptyArrays: false,
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
        {
          $unwind: {
            path: '$contact',
            preserveNullAndEmptyArrays: false,
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
        },
      ]).toArray();
    return contactList[0];
  } finally {
    client.close();
  }
};

export const handleGetContactList = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const contactListId = event.pathParameters.id;
    const results = await doGetContactList(userId, contactListId);
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
      message: e.message,
    };
    callback(null, response);
  }
};
