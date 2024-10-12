/* eslint-disable import/no-relative-packages */
import {
  crowdMassUpdateBadgesApply,
  CrowdMassUpdateBadgesApplyEventType,
} from 'crowd/lib/crowdMassUpdateBadges';

export default async (event: CrowdMassUpdateBadgesApplyEventType) => {
  try {
    await crowdMassUpdateBadgesApply(event);
  } catch (exception) {
    console.error('Caught unexpected exception :', exception);
  }
};
