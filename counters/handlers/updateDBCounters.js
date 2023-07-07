import updateDBCounter from '../lib/updateDBCounter';
import { ObjectID } from '../../libs/mongoClient';

export default async (updates) => {
  try {
    const promises = updates.map(async ({
      _id,
      appId,
      type,
      name,
      updateQuery,
      expiresDelay,
      updateToken,
    }) => {
      // Add a random delay between updates to avoid flooding the database
      await new Promise((resolve) => {
        setTimeout(resolve, Math.min(
          10000,
          100 * Math.random() * updates.length,
        ));
      });

      await updateDBCounter({
        _id: new ObjectID(_id),
        appId,
        type,
        name,
        updateQuery,
        expiresDelay,
        updateToken,
      });
    });

    await Promise.allSettled(promises);

    return ({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Caught error :', e);
    return ({ ok: false });
  }
};
