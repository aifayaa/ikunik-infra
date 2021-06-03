const common = {
  _id: true,
  actions: true,
  categoryId: true,
  createdAt: true,
  likes: true,
  permissions: true,
  pinned: true,
  publicationDate: true,
  publishedBy: true,
  storeProductId: true,
  summary: true,
  text: true,
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
