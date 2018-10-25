import doPostLineup from './postLineup';

export default async (event, context, callback) => {
  try {
    const {
      festivalId,
      stageId,
      artistId,
      startDate,
      endDate,
      ticketingURL,
      organisation,
      name,
    } = JSON.parse(event.body);

    if (!stageId || !artistId || !startDate || !endDate) {
      throw new Error('Bad arguments');
    }

    const results = await doPostLineup(
      festivalId,
      stageId,
      artistId,
      startDate,
      endDate,
      ticketingURL,
      organisation,
      name,
    );
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
