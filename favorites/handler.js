import { MongoClient } from 'mongodb';

export const doAddFavorite = async (userId, artistId) => {
  const favoriteData = {
    userId,
    artistId,
    isFavorite: true,
    date: new Date(),
  };
  const client = await MongoClient.connect(process.env.MONGO_URL);

  try {
    await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .update({ userId, artistId }, favoriteData, { upsert: true });
    return true;
  } finally {
    client.close();
  }
};

export const doUnfavorite = async (userId, artistId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  const data = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
    .findOne({ userId, artistId });
  let value;

  if (data) { value = !data.isFavorite; }

  try {
    await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .updateOne(
        { userId, artistId },
        {
          $set: { isFavorite: value, date: new Date() },
        }, {
          upsert: true,
        },
      );
    return true;
  } finally {
    client.close();
  }
};

export const handleAddFavorite = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const { artistId } = event.pathParameters;

  try {
    const result = await doAddFavorite(userId, artistId);
    const response = {
      statusCode: 200,
      body: JSON.stringify(result),
      header: {
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

export const handleUnfavorite = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const { artistId } = event.pathParameters;

  try {
    const result = await doUnfavorite(userId, artistId);
    const response = {
      statusCode: 200,
      body: JSON.stringify(result),
      header: {
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
