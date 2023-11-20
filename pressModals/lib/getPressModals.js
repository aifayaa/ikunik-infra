import hashLoginToken from '../../account/lib/hashLoginToken';
import { WordpressAPI } from '../../libs/backends/wordpress';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_APPS,
  COLL_PRESS_MODALS,
  COLL_USERS,
} = mongoCollections;

const publicFields = [
  '_id',
  'articleId',
  'html',
  'maxDisplayCount',
  'title',
  'type',
  'video',
  'zindex',
];

function countBadgesPerStatus(badges) {
  const counts = badges.reduce((acc, badge) => {
    const { status = 'validated' } = badge;
    acc[status] = (acc[status] || 0) + 1;
    return (acc);
  }, {});

  return (counts);
}

function haveBadges(user) {
  if (!user) return (false);
  if (!user.badges) return (false);
  if (user.badges.length === 0) return (false);

  const counts = countBadgesPerStatus(user.badges);
  if (counts.validated > 0) return (true);

  return (false);
}

function havePendingBadges(user) {
  if (!user) return (false);
  if (!user.badges) return (false);
  if (user.badges.length === 0) return (false);

  const counts = countBadgesPerStatus(user.badges);
  if (counts.requested > 0) return (true);

  return (false);
}

export default async function getBanners(appId, {
  type = null,
  articleId = null,
}, { userId, loginToken }) {
  const client = await MongoClient.connect();

  try {
    const query = { appId };

    if (type !== null) {
      query.type = type;
    }
    if (articleId !== null) {
      query.articleId = articleId;
    }

    const dbModals = await client
      .db()
      .collection(COLL_PRESS_MODALS)
      .find(query)
      .toArray();

    const dbUser = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId, appId });

    const modals = dbModals.filter((modal) => {
      if (typeof modal.loggedIn === 'boolean') {
        if ((!modal.loggedIn) !== (!userId)) {
          return (false);
        }
      }

      if (modal.badges) {
        if (typeof modal.badges.none === 'boolean') {
          if (!haveBadges(dbUser) !== modal.badges.none) {
            return (false);
          }
        }
        if (typeof modal.badges.pending === 'boolean') {
          if (havePendingBadges(dbUser) !== modal.badges.pending) {
            return (false);
          }
        }
      }

      return (true);
    }).map((modal) => (
      publicFields.reduce((acc, field) => {
        if (modal[field] !== undefined) {
          acc[field] = modal[field];
        }
        return (acc);
      }, {})
    ));

    if (appId === '77408f0a-ef4a-4339-8827-25ed684e5a26') {
      const systemikRhModals = {
        lessThan30days: {
          _id: 'systemikrh-modal-lessThan30days',
          appId: '0a65572c-c6fc-4687-9411-d31929e60dd9',
          loggedIn: false,
          zindex: 10,
          html: "<div class=\"mobile-modal-1 mobile-modal-whitefg\" style=\"background: radial-gradient(#103057, #041936); color: white;\">\n  <h2 style=\"margin: 0\">DEVENEZ MEMBRE PREMIUM</h2>\n  <h3 style=\"margin: 0\">de BASEBALL TV FRANCE</h3>\n\n  <ul>\n    <li><b>Liker</b> les articles qui vous plaisent</li>\n    <li><b>Commenter et partager</b> sur les articles et lives</li>\n    <li><b>Publier</b> vos propres articles sur la communauté</li>\n    <li><b>Profiter</b> d'avantages et cadeaux lors des événements <b>BASEBALL TV FRANCE</b></li>\n  </ul>\n\n  <div style=\"text-align: right;\">\n    <Login style=\"display: inline-block; padding: 0 1em; background-color: rgb(208, 17, 24); border-radius: 1.5em; width: auto; height: 2em; line-height: 1em; font-weight: bold;\">S'INSCRIRE</Login>\n  </div>\n</div>\n",
        },
        expired: {
          _id: 'systemikrh-modal-expired',
          appId: '0a65572c-c6fc-4687-9411-d31929e60dd9',
          loggedIn: false,
          zindex: 10,
          html: "<div class=\"mobile-modal-1 mobile-modal-whitefg\" style=\"background: radial-gradient(#103057, #041936); color: white;\">\n  <h2 style=\"margin: 0\">DEVENEZ MEMBRE PREMIUM</h2>\n  <h3 style=\"margin: 0\">de BASEBALL TV FRANCE</h3>\n\n  <ul>\n    <li><b>Liker</b> les articles qui vous plaisent</li>\n    <li><b>Commenter et partager</b> sur les articles et lives</li>\n    <li><b>Publier</b> vos propres articles sur la communauté</li>\n    <li><b>Profiter</b> d'avantages et cadeaux lors des événements <b>BASEBALL TV FRANCE</b></li>\n  </ul>\n\n  <div style=\"text-align: right;\">\n    <Login style=\"display: inline-block; padding: 0 1em; background-color: rgb(208, 17, 24); border-radius: 1.5em; width: auto; height: 2em; line-height: 1em; font-weight: bold;\">S'INSCRIRE</Login>\n  </div>\n</div>\n",
        },
      };

      const app = await client.db().collection(COLL_APPS).findOne({
        _id: appId,
      });

      const wpApi = new WordpressAPI(app);

      if (!loginToken) return (modals);
      const hashedToken = hashLoginToken(loginToken);
      const loginTokenObj = dbUser.services.resume.loginTokens.find(
        (itm) => (itm.hashedToken === hashedToken),
      );

      if (!loginTokenObj) return (modals);

      try {
        const response = await wpApi.authCall(
          'GET',
          '/crowdaa-sync/v1/systemikrh/userStatus',
          loginTokenObj.wpToken,
          null,
        );
        if (!response || !response.status || !systemikRhModals[response.status]) {
          return (modals);
        }

        return ([
          ...modals,
          systemikRhModals[response.status],
        ]);
      } catch (e) {
        /* Ignore error */
      }
    }

    return (modals);
  } finally {
    client.close();
  }
}
