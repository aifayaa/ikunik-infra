/* eslint-disable import/no-relative-packages */
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_CATEGORIES } = mongoCollections;

export default async (mongoClient, appId, name, pathName, id) => {
  /* Request for categories having the same appId and pathName */
  if (!pathName) return true;
  const queryExists = {
    appId,
    pathName,
  };

  if (id) queryExists._id = { $ne: id };
  const categoryFound = await mongoClient
    .db()
    .collection(COLL_PRESS_CATEGORIES)
    .findOne(queryExists);

  if (categoryFound) {
    let errorCatFound = `Already exists for appId ${appId}`;
    if (pathName && pathName === categoryFound.pathName) {
      errorCatFound = `Pathname ${pathName}, ${errorCatFound}`;
    }
    if (name === categoryFound.name) {
      errorCatFound = `Name ${name}, ${errorCatFound}`;
    }
    return errorCatFound;
  }
  return true;
};
