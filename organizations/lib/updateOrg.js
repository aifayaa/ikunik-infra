/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError.ts';
import {
  ERROR_TYPE_NOT_ALLOWED,
  ORGANISATION_APPLE_TEAM_ALREADY_SETUP_CODE,
} from '../../libs/httpResponses/errorCodes';
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import { objGet } from '../../libs/utils';

const { COLL_ORGANIZATIONS } = mongoCollections;

export default async (orgId, name, email, appleTeamId, appleCompanyName) => {
  const client = await MongoClient.connect();

  try {
    const $set = {};
    const updates = { $set };

    if (name) {
      $set.name = name;
    }

    if (name) {
      $set.email = email;
    }

    if (appleTeamId) {
      const currentOrg = await client
        .db()
        .collection(COLL_ORGANIZATIONS)
        .findOne({ _id: orgId });

      const setupDone = objGet(currentOrg, ['apple', 'setupDone']);
      if (setupDone) {
        throw new CrowdaaError(
          ERROR_TYPE_NOT_ALLOWED,
          ORGANISATION_APPLE_TEAM_ALREADY_SETUP_CODE,
          'The Apple TeamId was already set and validated, it cannot be changed anymore'
        );
      }

      const oldTeamId = objGet(currentOrg, ['apple', 'teamId']);

      if (oldTeamId !== appleTeamId) {
        $set['apple.teamId'] = appleTeamId.toUpperCase();
        $set['apple.teamStatus'] = 'checking';
        $set['apple.setupDone'] = false;
        updates.$unset = {
          'apple.itcTeamId': '',
          'apple.lastTeamIdCheck': '',
        };
      }
    }

    if (appleCompanyName) {
      $set['apple.companyName'] = appleCompanyName;
    }

    if (Object.keys($set).length > 0) {
      await client
        .db()
        .collection(COLL_ORGANIZATIONS)
        .update({ _id: orgId }, updates);
    }

    return await client
      .db()
      .collection(COLL_ORGANIZATIONS)
      .findOne({ _id: orgId });
  } finally {
    client.close();
  }
};
