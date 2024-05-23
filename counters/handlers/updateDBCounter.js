/* eslint-disable import/no-relative-packages */
import updateDBCounter from '../lib/updateDBCounter';
import { ObjectID } from '../../libs/mongoClient.ts';

export default async (event) => {
  const { _id, appId, type, name, updateQuery, expiresDelay, updateToken } =
    event;

  try {
    await updateDBCounter({
      _id: new ObjectID(_id),
      appId,
      type,
      name,
      updateQuery,
      expiresDelay,
      updateToken,
    });

    return { ok: true };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Caught error :', e);
    return { ok: false };
  }
};
