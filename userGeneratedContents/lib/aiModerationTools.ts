import {
  RekognitionClient,
  DetectModerationLabelsCommand,
  StartContentModerationCommand,
  GetContentModerationCommand,
  ModerationLabel,
  ContentModerationDetection,
} from '@aws-sdk/client-rekognition';
import {
  ComprehendClient,
  DetectToxicContentCommand,
} from '@aws-sdk/client-comprehend';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import mongoCollections from '@libs/mongoCollections.json';
import MongoClient from '@libs/mongoClient';
import { DEFAULT_APP_SETTINGS } from '@apps/lib/createApp';
import { UGCModerationNotificationDataType, UGCType } from './ugcEntities';
import { getUGCModerationAbstractText } from './ugcUtils';
import { checkFeaturePermsForApp } from '@libs/perms/checkPermsFor';

const {
  AI_DETECTION_DEFAULT_LANG,
  AI_DETECTION_DEFAULT_REGION,
  AI_DETECTION_ENABLED,
  AI_DETECTION_SNS_TOPIC_ARN,
  AI_VIDEO_MODERATION_COMPLETION_ROLE_ARN,
  REGION,
  S3_UPLOAD_BUCKET,
  STAGE,
} = process.env as {
  AI_DETECTION_DEFAULT_LANG: 'en';
  AI_DETECTION_DEFAULT_REGION: string;
  AI_DETECTION_ENABLED: 'true' | 'false';
  AI_DETECTION_SNS_TOPIC_ARN: string;
  AI_VIDEO_MODERATION_COMPLETION_ROLE_ARN: string;
  REGION: 'us-east-1' | 'eu-west-3';
  S3_UPLOAD_BUCKET: string;
  STAGE: 'dev' | 'preprod' | 'prod';
};

const { COLL_APPS, COLL_PICTURES, COLL_VIDEOS, COLL_USER_GENERATED_CONTENTS } =
  mongoCollections;

const comprehend = new ComprehendClient({
  apiVersion: '2017-11-27',
  region: AI_DETECTION_DEFAULT_REGION,
});

const rekognition = new RekognitionClient({
  apiVersion: '2016-06-27',
  region: AI_DETECTION_DEFAULT_REGION,
});

const lambda = new LambdaClient({
  apiVersion: '2016-06-27',
  region: REGION,
});

const TEXT_LABELS_WITH_SCORES: Record<string, number> = {
  PROFANITY: 0.85,
  HATE_SPEECH: 0.85,
  INSULT: 0.85,
  GRAPHIC: 0.85,
  HARASSMENT_OR_ABUSE: 0.85,
  SEXUAL: 0.85,
  VIOLENCE_OR_THREAT: 0.85,
};
const TEXT_TOXICITY_MAX = 0.85;

const MEDIA_LABELS_WITH_CONFIDENCES: Record<string, number> = {
  Explicit: 0.8,
  'Non-Explicit Nudity': 0.8,
  'Obstructed Intimate Parts': 0.8,
  'Graphic Violence': 0.8,
  'Visually Disturbing': 0.8,
  'Rude Gestures': 0.8,
  'Hate Symbols': 0.8,
};

const MEDIA_MIN_CONFIDENCE = Object.values(
  MEDIA_LABELS_WITH_CONFIDENCES
).reduce((acc, x) => {
  if (x > acc) return x;
  return acc;
}, 0);

type DatabaseVideoType = {
  _id: string;
  createdAt: Date;
  fromUserId: string;
  appId: string;
  status: number;
  sourceKey: string;
  name: string;
  distribution: string;
  title: string;
  filename: string;
  isPublished: true;
  thumbFilename: string;
  thumbUrl: string;
  url: string;
};

type DatabasePictureType = {
  _id: string;
  createdAt: Date;
  fromUserId: string;
  appId: string;
  status: number;
  sourceKey: string;
  name: string;

  pictureFilename: string;
  pictureUrl: string;
  pictureHeight: number;
  pictureWidth: number;

  largeFilename?: string;
  largeUrl?: string;
  largeHeight?: number;
  largeWidth?: number;

  mediumFilename?: string;
  mediumUrl?: string;
  mediumHeight?: number;
  mediumWidth?: number;

  thumbFilename?: string;
  thumbUrl?: string;
  thumbHeight?: number;
  thumbWidth?: number;
};

async function notifyUserOfAIModeration(ugc: UGCType, validated: boolean) {
  const buildNotifyData: UGCModerationNotificationDataType = {
    appId: ugc.appId,
    notifyAt: new Date(),
    type: 'ugcModeration',
    data: {
      ugcId: ugc._id,
      validated,
      abstract: getUGCModerationAbstractText(ugc),
      human: false,
      reason: '',
    },
  };

  await lambda.send(
    new InvokeCommand({
      InvocationType: 'Event',
      FunctionName: `blast-${STAGE}-queueNotifications`,
      Payload: JSON.stringify(buildNotifyData),
    })
  );
}

async function startCheckVideoForOffensiveMaterial(
  video: DatabaseVideoType,
  ugcId: string
) {
  const videoRekOutput = await rekognition.send(
    new StartContentModerationCommand({
      Video: {
        S3Object: {
          Bucket: S3_UPLOAD_BUCKET,
          Name: video.sourceKey,
        },
      },
      ClientRequestToken: video._id,
      JobTag: ugcId,
      MinConfidence: MEDIA_MIN_CONFIDENCE,
      NotificationChannel: {
        RoleArn: AI_VIDEO_MODERATION_COMPLETION_ROLE_ARN,
        SNSTopicArn: AI_DETECTION_SNS_TOPIC_ARN,
      },
    })
  );

  return videoRekOutput.JobId;
}

function isAwsMediaModeartionLabelsOffensive(label: ModerationLabel) {
  const {
    Confidence = 0,
    Name = '',
    // ParentName = '',
    // TaxonomyLevel = 0,
  } = label;

  if (MEDIA_LABELS_WITH_CONFIDENCES[Name]) {
    if (Confidence > MEDIA_LABELS_WITH_CONFIDENCES[Name]) {
      return true;
    }
  }

  return false;
}
function areAwsMediaModeartionLabelsOffensive(labels: ModerationLabel[]) {
  if (!labels) return false;

  const offensiveIndex = labels.findIndex(isAwsMediaModeartionLabelsOffensive);

  if (offensiveIndex >= 0) return true;

  return false;
}

function areAnyAwsMediaModerationDetectionOffensive(
  detection: ContentModerationDetection[]
) {
  const offensiveIndex = detection.findIndex((item) => {
    if (item.ModerationLabel) {
      const offensive = isAwsMediaModeartionLabelsOffensive(
        item.ModerationLabel
      );

      return offensive;
    }
  });

  if (offensiveIndex >= 0) return true;

  return false;
}

async function checkPictureForOffensiveMaterial(picture: DatabasePictureType) {
  const rekognitionRes = await rekognition.send(
    new DetectModerationLabelsCommand({
      Image: {
        S3Object: {
          Bucket: S3_UPLOAD_BUCKET,
          Name: picture.sourceKey,
        },
      },
      MinConfidence: MEDIA_MIN_CONFIDENCE,
    })
  );

  if (!rekognitionRes.ModerationLabels) return false;

  return areAwsMediaModeartionLabelsOffensive(rekognitionRes.ModerationLabels);
}

async function checkPicturesForOffensiveMaterial(
  picturesIds: string[],
  db: any
) {
  if (picturesIds.length === 0) return [];

  const pictures = await db
    .collection(COLL_PICTURES)
    .find({ _id: { $in: picturesIds } })
    .toArray();

  if (pictures.length === 0) return [];

  type AnyOffensiveItemType = string | null;

  const anyOffensive: AnyOffensiveItemType[] = await Promise.all(
    pictures.map(async (picture: DatabasePictureType | null) => {
      if (!picture) return null;

      const offensive = await checkPictureForOffensiveMaterial(picture);

      if (offensive) return picture._id;

      return null;
    })
  );

  return anyOffensive.filter((x) => x !== null);
}

async function checkVideosForOffensiveMaterial(
  videosIds: string[],
  db: any,
  ugcId: string
) {
  if (videosIds.length === 0) return [];

  const videos = await db
    .collection(COLL_VIDEOS)
    .find({ _id: { $in: videosIds } })
    .toArray();

  if (videos.length === 0) return [];

  type ProcessingIdItemType = { videoId: string; jobId: string } | null;

  const processingIds: ProcessingIdItemType[] = await Promise.all(
    videos.map(async (video: DatabaseVideoType | null) => {
      if (!video) return null;

      const jobId = await startCheckVideoForOffensiveMaterial(video, ugcId);
      if (!jobId) return null;

      return { videoId: video._id, jobId };
    })
  );

  return processingIds.filter((x) => x !== null);
}

async function checkTextForOffensiveMaterial(text: string) {
  const comprehendRes = await comprehend.send(
    new DetectToxicContentCommand({
      TextSegments: [
        {
          Text: text,
        },
      ],
      LanguageCode: AI_DETECTION_DEFAULT_LANG,
    })
  );

  if (!comprehendRes.ResultList) return false;

  const labels = comprehendRes.ResultList[0].Labels;
  const toxicity = comprehendRes.ResultList[0].Toxicity || 0;

  if (toxicity >= TEXT_TOXICITY_MAX) {
    return true;
  }

  const offensiveIndex = (labels || []).findIndex(
    ({ Name = '', Score = 0 }) => {
      if (TEXT_LABELS_WITH_SCORES[Name]) {
        if (Score > TEXT_LABELS_WITH_SCORES[Name]) {
          return true;
        }
      }

      return false;
    }
  );

  if (offensiveIndex >= 0) return true;

  return false;
}

type UGCOffensiveFieldType = {
  status: 'offensive' | 'inoffensive' | 'checking' | 'unchecked';
  title: boolean;
  content: boolean;
  picturesIds: Array<string>;
  videosIds: Array<string>;
  videoProcessing: Array<{
    videoId: string;
    jobId: string;
  }>;
};

export function isOffensiveMaterialFilteringEnabled() {
  return AI_DETECTION_ENABLED === 'true';
}

export function getUGCDefaultOffensiveField(enabled: boolean) {
  const offensive: UGCOffensiveFieldType = {
    status: enabled ? 'checking' : 'unchecked',
    title: false,
    content: false,
    picturesIds: [],
    videosIds: [],
    videoProcessing: [],
  };

  return offensive;
}

export async function startAiModerationForUgc(ugcId: string) {
  await lambda.send(
    new InvokeCommand({
      InvocationType: 'Event',
      FunctionName: `userGeneratedContents-${STAGE}-ugcOffensiveAsyncAnalysis`,
      Payload: JSON.stringify({
        ugcId,
      }),
    })
  );
}

export async function synchronousUgcAnalyze(ugcId: string) {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const ugc: UGCType | null = await client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .findOne({ _id: ugcId });

    if (!ugc) return;

    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne({ _id: ugc.appId });
    const {
      moderationRequired = DEFAULT_APP_SETTINGS.press.moderationRequired,
    } = app.settings.press || {};

    const offensive = getUGCDefaultOffensiveField(true);

    if (AI_DETECTION_ENABLED !== 'true') {
      return;
    }

    if (typeof ugc.data === 'string') {
      const offensiveContent = await checkTextForOffensiveMaterial(ugc.data);
      if (offensiveContent) {
        offensive.content = true;
      }
    } else if (typeof ugc.data === 'object') {
      const [
        offensiveContent,
        offensiveTitle,
        offensivePictures,
        videoProcessingIds,
      ] = await Promise.all([
        checkTextForOffensiveMaterial(ugc.data.content),
        checkTextForOffensiveMaterial(ugc.data.title),
        checkPicturesForOffensiveMaterial(ugc.data.pictures, db),
        checkVideosForOffensiveMaterial(ugc.data.videos, db, ugcId),
      ]);
      offensive.content = offensiveContent;
      offensive.title = offensiveTitle;
      offensive.picturesIds = offensivePictures;

      if (videoProcessingIds.length > 0) {
        offensive.videoProcessing = videoProcessingIds;
        /** @TODO Check videos (async process) */
      }
    }

    if (
      offensive.content ||
      offensive.title ||
      offensive.picturesIds.length > 0
    ) {
      offensive.status = 'offensive';
    } else if (offensive.videoProcessing.length > 0) {
      offensive.status = 'checking';
    } else {
      offensive.status = 'inoffensive';
    }

    if (moderationRequired) {
      const $set = { offensive };
      await client
        .db()
        .collection(COLL_USER_GENERATED_CONTENTS)
        .updateOne({ _id: ugcId }, { $set });
    } else {
      const dbUpdates: any = { $set: { offensive } };
      if (offensive.status === 'offensive' && ugc.reviewed === undefined) {
        dbUpdates.$set.reviewed = false;
      }

      await client
        .db()
        .collection(COLL_USER_GENERATED_CONTENTS)
        .updateOne({ _id: ugcId }, dbUpdates);
    }

    if (ugc.reviewed === undefined) {
      if (offensive.status === 'offensive') {
        await notifyUserOfAIModeration(ugc, false);
      } else if (offensive.status === 'inoffensive') {
        await notifyUserOfAIModeration(ugc, true);
      }
    }
  } finally {
    await client.close();
  }
}

export async function verifyUGCVideoModerationResults(
  ugcId: string,
  JobId: string,
  ok: boolean
) {
  if (!ok) return;

  const client = await MongoClient.connect();

  try {
    const ugc: UGCType | null = await client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .findOne({ _id: ugcId });

    if (!ugc || !ugc.offensive) return;

    const videoRekResults = await rekognition.send(
      new GetContentModerationCommand({
        JobId,
      })
    );

    const offensive = videoRekResults.ModerationLabels
      ? areAnyAwsMediaModerationDetectionOffensive(
          videoRekResults.ModerationLabels
        )
      : false;

    const processingIndex = ugc.offensive.videoProcessing.findIndex(
      ({ jobId: itemJobId }) => itemJobId === JobId
    );

    if (processingIndex < 0) return;

    const dbUpdates: any = {};
    const processingItem = ugc.offensive.videoProcessing[processingIndex];
    const { videoId } = processingItem;
    if (offensive) {
      dbUpdates.$push = { 'offensive.videosIds': videoId };
      dbUpdates.$set = { 'offensive.status': 'offensive' };
      if (ugc.reviewed === undefined) {
        dbUpdates.$set.reviewed = false;
      }
    }
    dbUpdates.$pull = { 'offensive.videoProcessing': processingItem };

    await client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .updateOne({ _id: ugcId }, dbUpdates);

    if (ugc.reviewed === undefined) {
      if (offensive) {
        await notifyUserOfAIModeration(ugc, false);
      } else {
        await notifyUserOfAIModeration(ugc, true);
      }
    }
  } finally {
    await client.close();
  }
}
