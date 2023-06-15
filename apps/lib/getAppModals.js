import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_PRESS_MODALS,
} = mongoCollections;

const boolEq = (a, b) => (!!a === !!b);

/**
 * Modals are managed by hand for now. Example structure :
{
  _id: 'abc-def-ghi',
  appId : '123-456-789',
  loggedIn : false, // Optionnal
  zindex : 10, // Z-index to add to the default 5000 value. (so 4 will give 5004 in the app)
  maxDisplayCount: 42, // Optionnal
  type: 'article', // defaults to 'article', can be 'app' or 'article' for now
  articleId: '1234-5678', // Optionnal, needed only for type=article
  html: '<p>some html code here</p>', // Optionnal if video is set
  video: 'abcd-efgh-ijkl', // Needed it html is not set, ID of video object
}
 */
export const getAppModals = async (
  appId,
  {
    userId = null,
  } = {},
) => {
  const client = await MongoClient.connect();
  try {
    const dbModals = await client
      .db()
      .collection(COLL_PRESS_MODALS)
      .find({ appId })
      .toArray();

    const modals = dbModals.filter((modal) => {
      if (modal.type !== 'app') {
        return (false);
      }
      if (typeof modal.loggedIn === 'boolean') {
        return (boolEq(modal.loggedIn, userId));
      }

      return (true);
    }).map(({
      _id,
      html,
      video,
      maxDisplayCount = null,
      zindex,
    }) => ({
      _id,
      html,
      video,
      maxDisplayCount,
      zindex,
    }));

    return (modals);
  } finally {
    client.close();
  }
};
