import supportedFormats from '../supportedFormats.json';

const {
  COLL_PICTURES,
  COLL_VIDEOS,
} = process.env;

export default (contentType, throwError = true) => {
  if (
    typeof supportedFormats[contentType] === 'undefined' ||
    !supportedFormats[contentType]
  ) {
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

  if (throwError) {
    throw new Error(`${contentType} not handled`);
  } else {
    return false;
  }
};
