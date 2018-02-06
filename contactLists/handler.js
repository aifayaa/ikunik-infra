import { MongoClient } from 'mongodb';

const doGetContactList = async (userId, contactListId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const contactList = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .aggregate([
        { $match: { _id: contactListId, user_ID: userId } },
        {
          $unwind: {
            path: '$contactIDs',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: 'contacts',
            localField: 'contactIDs',
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
            _id: '$_id',
            contacts: { $addToSet: '$contact' },
            contactListName: { $first: '$contactListName' },
            date: { $first: '$date' },
            profil_ID: { $first: '$profil_ID' },
            type: { $first: '$type' },
            user_ID: { $first: '$user_ID' },
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
