/* eslint-disable import/no-relative-packages */
import generateContent from '../lib/openAI-generateContent';

export default async (event) => {
  const { queryId } = event;

  try {
    const response = await generateContent(queryId);
    return response;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('Error', e);
    return {
      error: {
        message: e.message,
      },
    };
  }
};
