import supportedFormatsExtensions from '../supportedFormatsExtensions.json';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_DOCUMENTS,
  COLL_PICTURES,
  COLL_VIDEOS,
} = mongoCollections;

export default (contentType, throwError = true) => {
  if (!supportedFormatsExtensions[contentType]) {
    if (throwError) {
      throw new Error(`${contentType} not handled`);
    } else {
      return false;
    }
  }

  if (contentType.indexOf('image/') + 1) {
    return COLL_PICTURES;
  }
  if (contentType.indexOf('video/') + 1) {
    return COLL_VIDEOS;
  }
  if (contentType.indexOf('application/pdf') + 1) {
    return COLL_DOCUMENTS;
  }

  if (throwError) {
    throw new Error(`${contentType} not handled`);
  } else {
    return false;
  }
};
