import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_VALIDATION_ERROR,
  FEATURE_PLAN_NOT_FOUND_CODE,
  FEATURE_SPECIFICATION_NOT_VALID_CODE,
} from '@libs/httpResponses/errorCodes';
import { isDefined } from '@libs/check';
import { AppType } from '@apps/lib/appEntity';
import { getApp } from '@apps/lib/appsUtils';
import {
  allFeatureIds,
  allFeatureResetPeriod,
  allFeatureResetPeriodWindow,
  allPlanTypes,
  ComputedFeatureSpecificationType,
  FeatureIdType,
  FeaturePlanIdType,
  FeaturePlanType,
  FeatureResetPeriodType,
  FeatureResetPeriodWindowType,
} from './planTypes';

const allPlans: Readonly<Record<FeaturePlanIdType, FeaturePlanType>> = {
  oldFeaturePlanId: {
    _id: 'oldFeaturePlanId',
    tags: ['old'],
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
      appUsers: true,
    },
  },
  freeFeaturePlanId: {
    _id: 'freeFeaturePlanId',
    tags: ['free'],
    features: {
      appAnalytics: false,
      badges: false,
      chat: false,
      collaborators: {
        maxCount: 1,
        resetPeriod: 'month',
        resetPeriodWindow: 'fixed',
        isSoft: false,
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
        isSoft: true,
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
      liveStreams: true, // TODO Limit me later!!!
      appTabs: true,
      playlists: true,
      polls: true,
      appTheme: true,
      translations: true,
      appUsers: {
        maxCount: 10000,
        isSoft: true,
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
        isSoft: true,
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

function computeFeaturePlan(
  plan: FeaturePlanType,
  appPlan: FeaturePlanType | undefined,
  appCreatedAt: Date
) {
  const { features: planFeatures } = plan;
  const { features: appPlanFeatures } = appPlan || {};
  const features = {
    ...planFeatures,
    ...appPlanFeatures,
  };

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

      const resetPeriodWindowDefault: FeatureResetPeriodWindowType = 'rolling';
      const effectiveResetPeriodWindow =
        resetPeriodWindow ?? resetPeriodWindowDefault;

      if (
        isDefined(maxCount) &&
        Number.isInteger(maxCount) &&
        isDefined(resetPeriod) &&
        isAFeatureResetPeriod(resetPeriod) &&
        isDefined(resetPeriodWindow) &&
        isAFeatureResetPeriodWindow(resetPeriodWindow)
      ) {
        // TODO: retrieve 'startSubscriptionDate' from Stripe
        // Relevant only for rolling window
        // Use appCreatedAt for free apps anyway
        // Arbitrarily set it to yesterday for now
        const startSubscriptionDate =
          appCreatedAt || new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

        const [startDate, resetDate] = computeDates(
          resetPeriod,
          effectiveResetPeriodWindow,
          startSubscriptionDate
        );

        computedFeatures[featureId] = {
          maxCount,
          resetPeriod,
          resetPeriodWindow,
          currentUsage: 5000,
          currentPeriod: {
            startDate: startDate.toISOString(),
            resetDate: resetDate.toISOString(),
          },
        };

        if (isDefined(isSoft) && typeof isSoft === 'boolean') {
          computedFeatures[featureId].isSoft = isSoft;
        }
      } else if (
        isDefined(maxCount) &&
        Number.isInteger(maxCount) &&
        isDefined(resetPeriod) &&
        isAFeatureResetPeriod(resetPeriod)
      ) {
        const [startDate, resetDate] = computeDates(
          resetPeriod,
          resetPeriodWindowDefault
        );

        computedFeatures[featureId] = {
          maxCount,
          resetPeriod,
          currentUsage: 5000,
          currentPeriod: {
            startDate: startDate.toISOString(),
            resetDate: resetDate.toISOString(),
          },
        };

        if (isDefined(isSoft) && typeof isSoft === 'boolean') {
          computedFeatures[featureId].isSoft = isSoft;
        }
      } else if (isDefined(maxCount) && Number.isInteger(maxCount)) {
        computedFeatures[featureId] = {
          maxCount,
          currentUsage: 5000,
        };

        if (isDefined(isSoft) && typeof isSoft === 'boolean') {
          computedFeatures[featureId].isSoft = isSoft;
        }
      }
    }
  }

  return { ...plan, features: computedFeatures };
}

export function getCurrentPlanForApp(app: AppType) {
  const planId = app.featurePlan ? app.featurePlan._id : 'oldFeaturePlanId';
  if (!isAPlan(planId)) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      FEATURE_PLAN_NOT_FOUND_CODE,
      `Feature plan id ${planId} not found`
    );
  }

  const computedPlan = computeFeaturePlan(
    allPlans[planId],
    app.featurePlan as FeaturePlanType,
    app.createdAt
  );

  return computedPlan;
}

export async function getCurrentPlanForAppId(appId: string) {
  const app = await getApp(appId);

  const planId = app.featurePlan ? app.featurePlan._id : 'oldFeaturePlanId';
  if (!isAPlan(planId)) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      FEATURE_PLAN_NOT_FOUND_CODE,
      `Feature plan id ${planId} not found`
    );
  }

  const computedPlan = computeFeaturePlan(
    allPlans[planId],
    app.featurePlan as FeaturePlanType,
    app.createdAt
  );

  return computedPlan;
}
