import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  APP_NOT_FOUND_CODE,
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
  ComputedFeaturePlanType,
  ComputedFeatureSpecificationType,
  FeatureIdType,
  FeaturePlanIdType,
  FeaturePlanType,
  FeatureResetPeriodType,
  FeatureResetPeriodWindowType,
} from './planTypes';
import { currentUsageComputers } from './currentUsageComputers';

const allPlans: Readonly<Record<FeaturePlanIdType, FeaturePlanType>> = {
  legacyFeaturePlanId: {
    _id: 'legacyFeaturePlanId',
    tags: ['legacy'],
    name: {
      fr: 'Pionniers',
      en: 'Early adopter',
    },
    features: {
      appAnalytics: true,
      badges: true,
      chat: true,
      collaborators: true,
      community: true,
      liveStreams: true,
      liveStreamDuration: true,
      appTabs: true,
      playlists: true,
      polls: true,
      appTheme: true,
      translations: true,
      activeUsers: true,
    },
  },
  freeFeaturePlanId: {
    _id: 'freeFeaturePlanId',
    tags: ['free'],
    name: {
      fr: 'Gratuit',
      en: 'Free',
    },
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
      liveStreamDuration: false,
      appTabs: false,
      playlists: false,
      polls: false,
      appTheme: false,
      translations: false,
      activeUsers: {
        maxCount: 1000,
        isSoft: true,
      },
    },
  },
  proFeaturePlanId: {
    _id: 'proFeaturePlanId',
    tags: ['pro'],
    name: {
      fr: 'Pro',
      en: 'Pro',
    },
    features: {
      appAnalytics: true,
      badges: true,
      chat: true,
      collaborators: true,
      community: true,
      liveStreams: true,
      liveStreamDuration: true, // TODO Limit me later!!!
      appTabs: true,
      playlists: true,
      polls: true,
      appTheme: true,
      translations: true,
      activeUsers: {
        maxCount: 10000,
        isSoft: true,
      },
    },
  },
  entertainmentFeaturePlanId: {
    _id: 'entertainmentFeaturePlanId',
    tags: ['entertainment'],
    name: {
      fr: 'Divertissement',
      en: 'Entertainment',
    },
    features: {
      appAnalytics: true,
      badges: true,
      chat: true,
      collaborators: true,
      community: true,
      liveStreams: true,
      liveStreamDuration: true,
      appTabs: true,
      playlists: true,
      polls: true,
      appTheme: true,
      translations: true,
      activeUsers: {
        maxCount: 100000,
        isSoft: true,
      },
    },
  },
};

export const DEFAULT_NEW_APP_PLAN_ID = 'freeFeaturePlanId' as FeaturePlanIdType;
export const DEFAULT_OLD_APP_PLAN_ID =
  'legacyFeaturePlanId' as FeaturePlanIdType;

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

/**
 * Use year/month from now and apply it to startSubscriptionDate
 * If it wraps to the next month, cap it to the current month.
 */
function useCappedMonthAndYear(startSubscriptionDate: Date, now: Date) {
  const computedDate = new Date(startSubscriptionDate.getTime());
  computedDate.setFullYear(now.getFullYear());
  computedDate.setMonth(now.getMonth());

  if (computedDate.getMonth() !== now.getMonth()) {
    // It wrappet to next month (31st not possible on given month for ex.), cap it by the target month
    computedDate.setDate(1);
    computedDate.setHours(0);
    computedDate.setMinutes(0);
    computedDate.setSeconds(0);
    computedDate.setMilliseconds(-1); // Wrap back to previous month
  }

  return computedDate;
}

/**
 * Use year from now and apply it to startSubscriptionDate
 * If it wraps to the next month, cap it to the current month.
 */
function useCappedYear(startSubscriptionDate: Date, now: Date) {
  const computedDate = new Date(startSubscriptionDate.getTime());
  computedDate.setFullYear(now.getFullYear());

  if (
    computedDate.getFullYear() !== now.getFullYear() ||
    computedDate.getMonth() !== startSubscriptionDate.getMonth()
  ) {
    // It wrappet to next month (31st not possible on given month for ex.), cap it by the target month
    computedDate.setDate(1);
    computedDate.setHours(0);
    computedDate.setMinutes(0);
    computedDate.setSeconds(0);
    computedDate.setMilliseconds(-1); // Wrap back to previous month
  }

  return computedDate;
}

export function computePlanDates(
  resetPeriod: FeatureResetPeriodType,
  resetPeriodWindow: FeatureResetPeriodWindowType,
  startSubscriptionDate?: Date,
  now: Date = new Date()
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

  const getNow = () => new Date(now.getTime());

  switch (resetPeriodWindow) {
    case 'fixed': {
      switch (resetPeriod) {
        case 'week': {
          let startDate = getNow();

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
          let startDate = getNow();
          // Return to the beginning of the month
          startDate.setDate(1);
          startDate = resetWatch(startDate);

          const resetDate = new Date(startDate);
          resetDate.setMonth(resetDate.getMonth() + 1);

          return [startDate, resetDate];
        }
        case 'year': {
          let startDate = getNow();
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

          let startDate = getNow();

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

          const computedDate = useCappedMonthAndYear(
            startSubscriptionDate,
            now
          );

          if (computedDate.getTime() <= now.getTime()) {
            // We have the start date, compute the end
            const nextMonth = new Date(now);
            nextMonth.setDate(32);
            const startDate = computedDate;
            const resetDate = useCappedMonthAndYear(
              startSubscriptionDate,
              nextMonth
            );

            return [startDate, resetDate];
          } else {
            // We have the end date, compute the start
            const prevMonth = new Date(now);
            prevMonth.setDate(-1);
            const startDate = useCappedMonthAndYear(
              startSubscriptionDate,
              prevMonth
            );
            const resetDate = computedDate;

            return [startDate, resetDate];
          }
        }
        case 'year': {
          if (!isDefined(startSubscriptionDate)) {
            throw new CrowdaaError(
              ERROR_TYPE_VALIDATION_ERROR,
              FEATURE_SPECIFICATION_NOT_VALID_CODE,
              `When resetPeriodWindow is 'rolling', startSubscriptionDate is required: '${startSubscriptionDate}'`
            );
          }

          const computedDate = useCappedYear(startSubscriptionDate, now);

          if (computedDate.getTime() <= now.getTime()) {
            // We have the start date, compute the end
            const nextMonth = new Date(now);
            nextMonth.setDate(32);
            const startDate = computedDate;
            const resetDate = useCappedYear(startSubscriptionDate, nextMonth);

            return [startDate, resetDate];
          } else {
            // We have the end date, compute the start
            const prevMonth = new Date(now);
            prevMonth.setDate(-1);
            const startDate = useCappedYear(startSubscriptionDate, prevMonth);
            const resetDate = computedDate;

            return [startDate, resetDate];
          }
        }
      }
    }
  }
}

async function computeFeaturePlan(
  plan: FeaturePlanType,
  app: AppType,
  computeUsageFor: boolean | FeatureIdType[]
) {
  const appPlan = app.featurePlan;
  const appCreatedAt = app.createdAt;
  const { features: planFeatures } = plan;
  const { features: appPlanFeatures = {} } = appPlan || {};
  const features = {
    ...planFeatures,
    ...appPlanFeatures,
  };
  const appFeatureData = appPlan?.featuresData || {};
  const startedAt = appPlan?.startedAt || appCreatedAt;

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
          startedAt || new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

        const [startDate, resetDate] = computePlanDates(
          resetPeriod,
          effectiveResetPeriodWindow,
          startSubscriptionDate
        );

        let currentUsage = 0;
        if (
          (computeUsageFor === true ||
            (computeUsageFor instanceof Array &&
              computeUsageFor.indexOf(featureId) >= 0)) &&
          currentUsageComputers[featureId]
        ) {
          currentUsage = await currentUsageComputers[featureId](app);
        }

        computedFeatures[featureId] = {
          maxCount,
          resetPeriod,
          resetPeriodWindow,
          currentUsage,
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
        const [startDate, resetDate] = computePlanDates(
          resetPeriod,
          resetPeriodWindowDefault
        );

        let currentUsage = 0;
        if (
          (computeUsageFor === true ||
            (computeUsageFor instanceof Array &&
              computeUsageFor.indexOf(featureId) >= 0)) &&
          currentUsageComputers[featureId]
        ) {
          currentUsage = await currentUsageComputers[featureId](app);
        }

        computedFeatures[featureId] = {
          maxCount,
          resetPeriod,
          currentUsage,
          currentPeriod: {
            startDate: startDate.toISOString(),
            resetDate: resetDate.toISOString(),
          },
        };

        if (isDefined(isSoft) && typeof isSoft === 'boolean') {
          computedFeatures[featureId].isSoft = isSoft;
        }
      } else if (isDefined(maxCount) && Number.isInteger(maxCount)) {
        let currentUsage = 0;
        if (
          (computeUsageFor === true ||
            (computeUsageFor instanceof Array &&
              computeUsageFor.indexOf(featureId) >= 0)) &&
          currentUsageComputers[featureId]
        ) {
          currentUsage = await currentUsageComputers[featureId](app);
        }

        computedFeatures[featureId] = {
          maxCount,
          currentUsage,
        };

        if (isDefined(isSoft) && typeof isSoft === 'boolean') {
          computedFeatures[featureId].isSoft = isSoft;
        }
      }
    }
  }

  return {
    ...plan,
    features: computedFeatures,
    featureData: appFeatureData,
    startedAt,
  } as ComputedFeaturePlanType;
}

export async function getCurrentPlanForApp(
  app: AppType,
  computeUsageFor: boolean | FeatureIdType[] = false
) {
  const planId = app.featurePlan
    ? app.featurePlan._id
    : DEFAULT_OLD_APP_PLAN_ID;
  if (!isAPlan(planId)) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      FEATURE_PLAN_NOT_FOUND_CODE,
      `Feature plan id ${planId} not found`
    );
  }

  const computedPlan = await computeFeaturePlan(
    allPlans[planId],
    app,
    computeUsageFor
  );

  return computedPlan;
}

export async function getCurrentPlanForAppId(
  appId: string,
  computeUsageFor: boolean | FeatureIdType[] = false
) {
  const app = await getApp(appId);
  if (!app) {
    throw new CrowdaaError(
      ERROR_TYPE_NOT_FOUND,
      APP_NOT_FOUND_CODE,
      `App id ${appId} not found`
    );
  }

  const computedPlan = await getCurrentPlanForApp(app, computeUsageFor);

  return computedPlan;
}
