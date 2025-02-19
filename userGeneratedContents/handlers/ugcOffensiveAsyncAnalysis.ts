/* eslint-disable import/no-relative-packages */
import { synchronousUgcAnalyze } from '../lib/aiModerationTools';

export default async (event: { ugcId: string }) => {
  try {
    await synchronousUgcAnalyze(event.ugcId);
  } catch (exception) {
    console.log('ugcOffensiveAsyncAnalysis: Caught error:', exception);
  }
};
