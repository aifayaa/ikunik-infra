import { MongoClient } from 'mongodb';

const doGetUserProjects = async (userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const [{ projects }] = await client.db(process.env.DB_NAME).collection('profil')
      .aggregate([
        { $match: { UserId: userId } },
        {
          $lookup: {
            from: 'Project',
            localField: '_id',
            foreignField: 'profil_ID',
            as: 'projects',
          },
        },
        {
          $project: {
            _id: 0,
            projects: 1,
          },
        },
      ]).toArray();
    return { projects };
  } finally {
    client.close();
  }
};

export const handleGetUserProjects = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    const response = {
      statusCode: 403,
      body: JSON.stringify({ message: 'Forbidden' }),
    };
    callback(null, response);
    return;
  }
  try {
    const results = await doGetUserProjects(userId);
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
