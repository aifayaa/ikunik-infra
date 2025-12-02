import processUsersStars from '../lib/processUsersStars';

const { FID_APPS_ID } = process.env;

export default async () => {
  try {
    if (!FID_APPS_ID) return;

    const ret = await processUsersStars(FID_APPS_ID);

    console.log('Debugging logs :', ret);

    return ret;
  } catch (exception) {
    console.error(`Caught global error :`, exception);
  }
};
