const {
  COLL_PICTURES,
  COLL_VIDEOS,
} = process.env;

export default (contentType, throwError = true) => {
  switch (contentType) {
    case 'image/gif':
    case 'image/jpeg':
    case 'image/png':
      return COLL_PICTURES;
    case 'video/avi':
    case 'video/mkv':
    case 'video/mp4':
    case 'video/quicktime':
    case 'video/webm':
      return COLL_VIDEOS;
    default:
      if (throwError) {
        throw new Error(`${contentType} not handled`);
      } else {
        return false;
      }
  }
};
