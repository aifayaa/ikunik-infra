import { APIGatewayProxyEvent } from 'aws-lambda';

import response, { handleException } from '@libs/httpResponses/response';
import { formatResponseBody } from '@libs/httpResponses/formatResponseBody';
import { getApp } from '@apps/lib/appsUtils';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_VALIDATION_ERROR,
  FEATURE_PLAN_NOT_FOUND_CODE,
  FEATURE_SPECIFICATION_NOT_VALID_CODE,
} from '@libs/httpResponses/errorCodes';
import { isDefined } from '@libs/check';

type FeaturePlanIdType =
  | 'freeFeaturePlanId'
  | 'proFeaturePlanId'
  | 'entertainmentFeaturePlanId';
const allPlanTypes: FeaturePlanIdType[] = [
  'freeFeaturePlanId',
  'proFeaturePlanId',
  'entertainmentFeaturePlanId',
];

type FeatureIdType =
  | 'appAnalytics'
  | 'appTabs'
  | 'appTheme'
  | 'appUsers'
  | 'badges'
  | 'chat'
  | 'collaborators'
  | 'community'
  | 'liveStreams'
  | 'playlists'
  | 'polls'
  | 'translations';
const allFeatureIds: FeatureIdType[] = [
  'appAnalytics',
  'appTabs',
  'appTheme',
  'appUsers',
  'badges',
  'chat',
  'collaborators',
  'community',
  'liveStreams',
  'playlists',
  'polls',
  'translations',
];

type FeatureResetPeriodType = 'week' | 'month' | 'year';
const allFeatureResetPeriod: FeatureResetPeriodType[] = [
  'week',
  'month',
  'year',
];

type FeatureResetPeriodWindowType = 'rolling' | 'fixed';
const allFeatureResetPeriodWindow: FeatureResetPeriodWindowType[] = [
  'rolling',
  'fixed',
];

type FeatureSpecificationType =
  | boolean
  | {
      maxCount: number;
      maxDuration?: number;
      resetPeriod?: FeatureResetPeriodType;
      resetPeriodWindow?: FeatureResetPeriodWindowType;
      isSoft?: boolean;
    };

type ComputedFeatureSpecificationType =
  | boolean
  | {
      maxCount: number;
      currentUsage: number;
      isSoft?: boolean;
    }
  | {
      maxCount: number;
      currentUsage: number;
      resetPeriod: FeatureResetPeriodType;
      currentPeriod: {
        startDate: string;
        resetDate: string;
      };
      maxDuration?: number;
      resetPeriodWindow?: FeatureResetPeriodWindowType;
      isSoft?: boolean;
    };

type FeaturePlanType = {
  _id: FeaturePlanIdType;
  tags: string[];
  features: Partial<Record<FeatureIdType, FeatureSpecificationType>>;
};

const allPlans: Readonly<Record<FeaturePlanIdType, FeaturePlanType>> = {
  freeFeaturePlanId: {
    _id: 'freeFeaturePlanId',
    tags: ['free'],
    features: {
      appAnalytics: false,
      badges: false,
      chat: false,
      collaborators: {
        maxCount: 1,
      },
      community: false,
      liveStreams: false,
      appTabs: false,
      playlists: false,
      polls: false,
      appTheme: false,
      translations: false,
      appUsers: {
        maxCount: 1000,
      },
    },
  },
  proFeaturePlanId: {
    _id: 'proFeaturePlanId',
    tags: ['pro'],
    features: {
      appAnalytics: true,
      badges: true,
      chat: true,
      collaborators: true,
      community: true,
      liveStreams: false,
      appTabs: true,
      playlists: true,
      polls: true,
      appTheme: true,
      translations: true,
      appUsers: {
        maxCount: 10000,
      },
    },
  },
  entertainmentFeaturePlanId: {
    _id: 'entertainmentFeaturePlanId',
    tags: ['entertainment'],
    features: {
      appAnalytics: true,
      badges: true,
      chat: true,
      collaborators: true,
      community: true,
      liveStreams: true,
      appTabs: true,
      playlists: true,
      polls: true,
      appTheme: true,
      translations: true,
      appUsers: {
        maxCount: 100000,
      },
    },
  },
};

function isAPlan(plan: string): plan is FeaturePlanIdType {
  return allPlanTypes.includes(plan as FeaturePlanIdType);
}

function isAFeatureId(featureId: string): featureId is FeatureIdType {
  return allFeatureIds.includes(featureId as FeatureIdType);
}

function isAFeatureResetPeriod(
  featureResetPeriod: string
): featureResetPeriod is FeatureResetPeriodType {
  return allFeatureResetPeriod.includes(
    featureResetPeriod as FeatureResetPeriodType
  );
}

function isAFeatureResetPeriodWindow(
  featureResetPeriodWindow: string
): featureResetPeriodWindow is FeatureResetPeriodWindowType {
  return allFeatureResetPeriodWindow.includes(
    featureResetPeriodWindow as FeatureResetPeriodWindowType
  );
}

function computeDates(
  resetPeriod: FeatureResetPeriodType,
  resetPeriodWindow: FeatureResetPeriodWindowType,
  startSubscriptionDate?: Date
) {
  function resetWatch(date: Date, referenceDate?: Date) {
    const resDate = new Date(date);

    if (referenceDate) {
      resDate.setMilliseconds(referenceDate.getMilliseconds());
      resDate.setSeconds(referenceDate.getSeconds());
      resDate.setMinutes(referenceDate.getMinutes());
      resDate.setHours(referenceDate.getHours());
    } else {
      resDate.setMilliseconds(0);
      resDate.setSeconds(0);
      resDate.setMinutes(0);
      resDate.setHours(0);
    }

    // Take timezone into account
    resDate.setMinutes(resDate.getMinutes() - resDate.getTimezoneOffset());

    return resDate;
  }

  switch (resetPeriodWindow) {
    case 'fixed': {
      switch (resetPeriod) {
        case 'week': {
          let startDate = new Date();

          // Return to Monday
          while (startDate.getDay() !== 1) {
            startDate = new Date(startDate.setDate(startDate.getDate() - 1));
          }
          startDate = resetWatch(startDate);

          const resetDate = new Date(startDate);
          resetDate.setDate(resetDate.getDate() + 7);

          return [startDate, resetDate];
        }
        case 'month': {
          let startDate = new Date();
          // Return to the beginning of the month
          startDate.setDate(1);
          startDate = resetWatch(startDate);

          const resetDate = new Date(startDate);
          resetDate.setMonth(resetDate.getMonth() + 1);

          return [startDate, resetDate];
        }
        case 'year': {
          let startDate = new Date();
          // Return to the beginning of the year
          startDate.setMonth(0);
          startDate.setDate(1);
          startDate = resetWatch(startDate);

          const resetDate = new Date(startDate);
          resetDate.setFullYear(resetDate.getFullYear() + 1);

          return [startDate, resetDate];
        }
      }
    }
    case 'rolling': {
      switch (resetPeriod) {
        case 'week': {
          if (!isDefined(startSubscriptionDate)) {
            throw new CrowdaaError(
              ERROR_TYPE_VALIDATION_ERROR,
              FEATURE_SPECIFICATION_NOT_VALID_CODE,
              `When resetPeriodWindow is 'rolling', startSubscriptionDate is required: '${startSubscriptionDate}'`
            );
          }

          let startDate = new Date();

          // Return to the same day of the week as 'startSubscriptionDate'
          while (startDate.getDay() !== startSubscriptionDate.getDay()) {
            startDate = new Date(startDate.setDate(startDate.getDate() - 1));
          }

          startDate = resetWatch(startDate, startSubscriptionDate);

          const resetDate = new Date(startDate);
          resetDate.setDate(resetDate.getDate() + 7);

          return [startDate, resetDate];
        }
        case 'month': {
          if (!isDefined(startSubscriptionDate)) {
            throw new CrowdaaError(
              ERROR_TYPE_VALIDATION_ERROR,
              FEATURE_SPECIFICATION_NOT_VALID_CODE,
              `When resetPeriodWindow is 'rolling', startSubscriptionDate is required: '${startSubscriptionDate}'`
            );
          }

          const today = new Date();

          let startDateCandidate = new Date(startSubscriptionDate);
          let startDatePlusOneMonthCandidate = new Date(startDateCandidate);
          startDatePlusOneMonthCandidate.setMonth(
            startDatePlusOneMonthCandidate.getMonth() + 1
          );

          let searchAttempt = 0;
          const MAX_SEARCH_ATTEMPTS = 1000;
          while (
            !(
              startDateCandidate <= today &&
              today < startDatePlusOneMonthCandidate
            )
          ) {
            startDateCandidate.setMonth(startDateCandidate.getMonth() + 1);
            startDatePlusOneMonthCandidate.setMonth(
              startDatePlusOneMonthCandidate.getMonth() + 1
            );
            searchAttempt += 1;

            if (MAX_SEARCH_ATTEMPTS < searchAttempt) {
              throw new CrowdaaError(
                ERROR_TYPE_VALIDATION_ERROR,
                FEATURE_SPECIFICATION_NOT_VALID_CODE,
                `Cannot find month window startSubscriptionDate:'${startSubscriptionDate}', today:'${today}', resetPeriod: '${resetPeriod}', resetPeriodWindow:'${resetPeriodWindow}'`
              );
            }
          }

          const startDate = startDateCandidate;
          const resetDate = new Date(startDate);
          resetDate.setMonth(resetDate.getMonth() + 1);

          return [startDate, resetDate];
        }
        case 'year': {
          if (!isDefined(startSubscriptionDate)) {
            throw new CrowdaaError(
              ERROR_TYPE_VALIDATION_ERROR,
              FEATURE_SPECIFICATION_NOT_VALID_CODE,
              `When resetPeriodWindow is 'rolling', startSubscriptionDate is required: '${startSubscriptionDate}'`
            );
          }

          const today = new Date();

          let startDateCandidate = new Date(startSubscriptionDate);
          let startDatePlusOneMonthCandidate = new Date(startDateCandidate);
          startDatePlusOneMonthCandidate.setFullYear(
            startDatePlusOneMonthCandidate.getFullYear() + 1
          );

          let searchAttempt = 0;
          const MAX_SEARCH_ATTEMPTS = 100;
          while (
            startDateCandidate <= today &&
            today < startDatePlusOneMonthCandidate
          ) {
            startDateCandidate.setFullYear(
              startDateCandidate.getFullYear() + 1
            );
            startDatePlusOneMonthCandidate.setFullYear(
              startDatePlusOneMonthCandidate.getFullYear() + 1
            );
            searchAttempt += 1;

            if (MAX_SEARCH_ATTEMPTS < searchAttempt) {
              throw new CrowdaaError(
                ERROR_TYPE_VALIDATION_ERROR,
                FEATURE_SPECIFICATION_NOT_VALID_CODE,
                `Cannot find month window startSubscriptionDate:'${startSubscriptionDate}', today:'${today}', resetPeriod: '${resetPeriod}', resetPeriodWindow:'${resetPeriodWindow}'`
              );
            }
          }

          const startDate = startDateCandidate;
          const resetDate = new Date(startDate);
          resetDate.setFullYear(resetDate.getFullYear() + 1);

          return [startDate, resetDate];
        }
      }
    }
  }
}

function computeFeaturePlan(plan: FeaturePlanType) {
  const { features } = plan;

  const computedFeatures: Partial<
    Record<FeatureIdType, ComputedFeatureSpecificationType>
  > = {};

  for (const [featureId, feature] of Object.entries(features)) {
    if (!isAFeatureId(featureId)) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        FEATURE_SPECIFICATION_NOT_VALID_CODE,
        `Feature id ${featureId} is not valid`
      );
    }

    if (typeof feature === 'boolean') {
      computedFeatures[featureId] = feature;
    } else if (typeof feature === 'object') {
      const { maxCount, resetPeriod, resetPeriodWindow, isSoft } = feature;

      if (isDefined(maxCount)) {
        if (!Number.isInteger(maxCount)) {
          throw new CrowdaaError(
            ERROR_TYPE_VALIDATION_ERROR,
            FEATURE_SPECIFICATION_NOT_VALID_CODE,
            `[featureId:'${featureId}'] Spec maxCount is not valid: '${maxCount}')`
          );
        }
      }

      if (isDefined(resetPeriod)) {
        if (!isAFeatureResetPeriod(resetPeriod)) {
          throw new CrowdaaError(
            ERROR_TYPE_VALIDATION_ERROR,
            FEATURE_SPECIFICATION_NOT_VALID_CODE,
            `[featureId:'${featureId}'] Spec resetPeriod is not valid: '${resetPeriod}')`
          );
        }
      }

      if (isDefined(resetPeriodWindow)) {
        if (!isAFeatureResetPeriodWindow(resetPeriodWindow)) {
          throw new CrowdaaError(
            ERROR_TYPE_VALIDATION_ERROR,
            FEATURE_SPECIFICATION_NOT_VALID_CODE,
            `[featureId:'${featureId}'] Spec resetPeriodWindow is not valid: '${resetPeriodWindow}')`
          );
        }
      }

      if (isDefined(isSoft)) {
        if (!(typeof isSoft === 'boolean')) {
          throw new CrowdaaError(
            ERROR_TYPE_VALIDATION_ERROR,
            FEATURE_SPECIFICATION_NOT_VALID_CODE,
            `[featureId:'${featureId}'] Spec isSoft is not valid: '${isSoft}')`
          );
        }
      }

      const resetPeriodWindowDefault: FeatureResetPeriodWindowType = 'rolling';
      const effectiveResetPeriodWindow =
        resetPeriodWindow ?? resetPeriodWindowDefault;
      if (
        isDefined(maxCount) &&
        isDefined(resetPeriod) &&
        isDefined(effectiveResetPeriodWindow)
      ) {
        // TODO: retrieve 'startSubscriptionDate' from Stripe
        // Relevant only for rolling window
        // Arbitrarily set it to yesterday
        const startSubscriptionDate = new Date(
          new Date().getTime() - 24 * 60 * 60 * 1000
        );

        const [startDate, resetDate] = computeDates(
          resetPeriod,
          effectiveResetPeriodWindow,
          startSubscriptionDate
        );

        computedFeatures[featureId] = {
          ...feature,
          currentUsage: 5000,
          currentPeriod: {
            startDate: startDate.toISOString(),
            resetDate: resetDate.toISOString(),
          },
        };
      } else if (isDefined(maxCount) && isDefined(resetPeriod)) {
        const [startDate, resetDate] = computeDates(
          resetPeriod,
          resetPeriodWindowDefault
        );

        computedFeatures[featureId] = {
          ...feature,
          currentUsage: 5000,
          currentPeriod: {
            startDate: startDate.toISOString(),
            resetDate: resetDate.toISOString(),
          },
        };
      } else if (typeof maxCount === 'number') {
        computedFeatures[featureId] = {
          ...feature,
          currentUsage: 5000,
        };
      } else {
        throw new CrowdaaError(
          ERROR_TYPE_VALIDATION_ERROR,
          FEATURE_SPECIFICATION_NOT_VALID_CODE,
          `Feature specification for feature:'${featureId}' is not valid (maxCount:'${maxCount}', resetPeriod:'${resetPeriod}', resetPeriodWindow:'${resetPeriodWindow}', isSoft:'${isSoft}')`
        );
      }
    }
  }

  return { ...plan, features: computedFeatures };
}

export default async (event: APIGatewayProxyEvent) => {
  const { id: appId } = event.pathParameters as { id: string };

  try {
    const app = await getApp(appId);

    const planId = app.featurePlan ? app.featurePlan._id : 'freeFeaturePlanId';
    if (!isAPlan(planId)) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        FEATURE_PLAN_NOT_FOUND_CODE,
        `Feature plan id ${planId} not found`
      );
    }

    const computedPlan = computeFeaturePlan(allPlans[planId]);

    return response({
      code: 200,
      body: formatResponseBody({
        data: computedPlan,
      }),
    });
  } catch (exception) {
    return handleException(exception);
  }
};
