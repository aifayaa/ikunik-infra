/* eslint-disable import/no-relative-packages */
const common = {
  _id: true,
  actions: true,
  authorName: true,
  badges: true,
  categories: true,
  categoriesId: true,
  categoryId: true,
  createdAt: true,
  displayOptions: true,
  eventEndDate: true,
  eventStartDate: true,
  feedPicture: true,
  isEvent: true,
  isPoll: true,
  isWebview: true,
  likes: true,
  md: true,
  mediaCaptions: true,
  pdfs: true,
  pdfsOpenButton: true,
  permissions: true,
  pictures: true,
  pinned: true,
  publicationDate: true,
  publishedBy: true,
  shareUrl: true,
  storeProductId: true,
  summary: true,
  text: true,
  thumbnailDisplayMethod: true,
  title: true,
  unpublicationDate: true,
  user: true,
  videoPlayMode: true,
  videos: true,
  views: true,
};

const admin = {
  ...common,
  isPublished: true,
  updatedAt: true,
  updatedBy: true,
};

const server = {
  ...admin,
  plainText: true,
};

export default {
  common,
  admin,
  server,
};

export { common, admin, server };
