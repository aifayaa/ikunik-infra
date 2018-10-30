import postStage from '../lib/postStage';

export default async (event, context, callback) => {
  try {
    if (!event.body) {
      throw new Error('mal_formed_request');
    }
    const { name } = JSON.parse(event.body);
    if (!name) {
      throw new Error('mal_formed_request');
    }

    const results = await postStage(name);
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
