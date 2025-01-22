/* eslint-disable import/no-relative-packages */
import { WordpressAPI } from '../../libs/backends/wordpress';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS, COLL_PRESS_MODALS, COLL_USERS } = mongoCollections;

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
    const { status = 'assigned' } = badge;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return counts;
}

function haveBadges(user) {
  if (!user) return false;
  if (!user.badges) return false;
  if (user.badges.length === 0) return false;

  const counts = countBadgesPerStatus(user.badges);
  if (counts.assigned > 0 || counts.validated > 0) return true;

  return false;
}

function havePendingBadges(user) {
  if (!user) return false;
  if (!user.badges) return false;
  if (user.badges.length === 0) return false;

  const counts = countBadgesPerStatus(user.badges);
  if (counts.requested > 0) return true;

  return false;
}

export default async function getPressModals(
  appId,
  { type = null, articleId = null },
  { userId, loginTokenObj }
) {
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

    const modals = dbModals
      .filter((modal) => {
        if (typeof modal.loggedIn === 'boolean') {
          if (!modal.loggedIn !== !userId) {
            return false;
          }
        }

        if (modal.badges) {
          if (typeof modal.badges.none === 'boolean') {
            if (!haveBadges(dbUser) !== modal.badges.none) {
              return false;
            }
          }
          if (typeof modal.badges.pending === 'boolean') {
            if (havePendingBadges(dbUser) !== modal.badges.pending) {
              return false;
            }
          }
        }

        return true;
      })
      .map((modal) =>
        publicFields.reduce((acc, field) => {
          if (modal[field] !== undefined) {
            acc[field] = modal[field];
          }
          return acc;
        }, {})
      );

    if (appId === '77408f0a-ef4a-4339-8827-25ed684e5a26') {
      const systemikRhModals = {
        lessThan30days: {
          _id: 'systemikrh-modal-lessThan30days',
          type: 'app',
          zindex: 10,
          html: `<div class="mobile-modal-1" style="background: #fff3cd;">
  <h2 style="color: #E4A11B; margin: 0; text-align:center">Votre adhésion expire dans moins de 30 jours !</h2>
  <h3 style="color: #E4A11B; margin: 5%; text-align:center">Cliquez sur le bouton ci-dessous pour la renouveler.</h3>

  <div style="text-align: right;">
    <a href="https://systemik-rh.fr/adhesion/" style="display: inline-block; padding: 0 1em; background-color: #00968f; border-radius: 5px; width: auto; height: 2em; line-height: 2em; font-weight: bold; color: white; font-size:1.2em">Renouveler</a>
  </div>
</div>`,
        },
        expired: {
          _id: 'systemikrh-modal-expired',
          type: 'app',
          zindex: 10,
          html: `<div class="mobile-modal-1" style="background: #f8d7da;">
  <h2 style="color: #8e2f38; margin: 0; text-align:center">Votre adhésion a expiré !</h2>
  <h3 style="color: #8e2f38; margin: 5%; text-align:center">Cliquez sur le bouton ci-dessous pour la renouveler.</h3>

  <div style="text-align: right;">
    <a href="https://systemik-rh.fr/adhesion/" style="display: inline-block; padding: 0 1em; background-color: #00968f; border-radius: 5px; width: auto; height: 2em; line-height: 2em; font-weight: bold; color: white; font-size:1.2em">Renouveler</a>
  </div>
</div>`,
        },
      };

      const app = await client.db().collection(COLL_APPS).findOne({
        _id: appId,
      });

      const wpApi = new WordpressAPI(app);

      if (!loginTokenObj) return modals;

      try {
        let response = await wpApi.authCall(
          'GET',
          '/crowdaa-sync/v1/systemikrh/userStatus',
          loginTokenObj.wpToken,
          null
        );
        response = JSON.parse(response);
        if (
          !response ||
          !response.status ||
          !systemikRhModals[response.status]
        ) {
          return modals;
        }

        return [...modals, systemikRhModals[response.status]];
      } catch (e) {
        /* Ignore error */
      }
    }

    return modals;
  } finally {
    client.close();
  }
}
