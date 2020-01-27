export const getRuleName = (lineupId) => `CronJobLineup-${lineupId}`;
export const getTargetId = (lineupId) => `CronLineupTarget-${lineupId}`;
export const getStatementId = (lineupId) => `${getRuleName(lineupId)}_permission`;
