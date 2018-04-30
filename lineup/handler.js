import { MongoClient } from 'mongodb';

const doGetLineup = async (someId, type) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const selector = {};
    selector[type] = someId;
    const lineup = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .aggregate([
        { $match: selector },
        {
          $lookup: {
            from: 'festivals',
            localField: 'festivalId',
            foreignField: '_id',
            as: 'festival',
          },
        },
        {
          $unwind: {
            path: '$festival',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: 'artists',
            localField: 'artistId',
            foreignField: '_id',
            as: 'artist',
          },
        },
        {
          $unwind: {
            path: '$artist',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: 'stages',
            localField: 'stageId',
            foreignField: '_id',
            as: 'stage',
          },
        },
        {
          $unwind: {
            path: '$stage',
            preserveNullAndEmptyArrays: false,
          },
        },
      ]).toArray();
    return { lineup };
  } finally {
    client.close();
  }
};

export const handleGetLineup = async (event, context, callback) => {
  try {
    const someId = event.pathParameters.id;
    let type;
    switch (event.resource.split('/')[1]) {
      case 'artists':
        type = 'artistId';
        break;
      case 'stages':
        type = 'stageId';
        break;
      case 'festivals':
        type = 'festivalId';
        break;
      default:
        type = undefined;
    }
    const results = await doGetLineup(someId, type);
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
    };
    callback(null, response);
  }
};
