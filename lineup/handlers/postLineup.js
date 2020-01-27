import postLineup from '../lib/postLineup';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
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
      pictureId,
    } = JSON.parse(event.body);

    if (!stageId || !artistId || !startDate || !endDate) {
      throw new Error('Bad arguments');
    }

    const results = await postLineup(
      festivalId,
      stageId,
      artistId,
      startDate,
      endDate,
      ticketingURL,
      organisation,
      name,
      undefined,
      pictureId,
      appId,
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
