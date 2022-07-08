const common = {
  _id: true,
  actions: true,
  authorName: true,
  badges: true,
  categoryId: true,
  createdAt: true,
  displayOptions: true,
  isWebview: true,
  likes: true,
  mediaCaptions: true,
  pdfs: true,
  pdfsOpenButton: true,
  permissions: true,
  pinned: true,
  publicationDate: true,
  publishedBy: true,
  storeProductId: true,
  summary: true,
  text: true,
  thumbnailDisplayMethod: true,
  title: true,
  user: true,
  videoPlayMode: true,
  views: true,
};

const admin = {
  ...common,
  isPublished: true,
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

export {
  common,
  admin,
  server,
};
