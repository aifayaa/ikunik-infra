import { EventBridgeEvent } from 'aws-lambda';
import MongoClient from '../../libs/mongoClient';
import uploadStatus from '../uploadStatus.json';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_VIDEOS } = mongoCollections;

const { CDN_DOMAIN_NAME } = process.env;

type ManageVideoUserMetadata = {
  id: string;
  name: string;
};

interface MediaConvertJobDetail {
  timestamp: number;
  accountId: string;
  queue: string;
  jobId: string;
  status: 'COMPLETE' | 'ERROR' | 'CANCELED' | 'PROGRESSING' | 'SUBMITTED';
  userMetadata?: {
    [key: string]: string;
  };
  outputGroupDetails?: OutputGroupDetail[];
  errorCode?: number;
  errorMessage?: string;
  jobTemplate?: string;
  accelerationSettings?: {
    mode: string;
  };
  priority?: number;
  statusUpdateVersion?: number;
}

interface OutputGroupDetail {
  outputDetails: OutputDetail[];
  type:
    | 'HLS_GROUP'
    | 'FILE_GROUP'
    | 'CMAF_GROUP'
    | 'DASH_ISO_GROUP'
    | 'MS_SMOOTH_GROUP';
  playlistFilePaths?: string[];
}

interface OutputDetail {
  outputFilePaths: string[];
  durationInMs?: number;
  videoDetails?: {
    widthInPx: number;
    heightInPx: number;
  };
}

// EventBridge event type for MediaConvert
type MediaConvertEvent = EventBridgeEvent<
  'MediaConvert Job State Change',
  MediaConvertJobDetail
>;

async function handleComplete(
  event: MediaConvertEvent,
  finalMetadata: ManageVideoUserMetadata,
  { client }: { client: any }
) {
  const { jobId, outputGroupDetails } = event.detail;

  // Extract output information
  const hlsOutputs = outputGroupDetails?.find((g) => g.type === 'HLS_GROUP');
  const thumbnailOutputs = outputGroupDetails?.find(
    (g) => g.type === 'FILE_GROUP'
  );

  let rootVideoS3Path = null;
  if (hlsOutputs?.playlistFilePaths) {
    for (const playlistPath of hlsOutputs.playlistFilePaths) {
      rootVideoS3Path = playlistPath;
    }
  }

  let lastThumbnailS3Path = null;
  if (thumbnailOutputs?.outputDetails) {
    for (const output of thumbnailOutputs.outputDetails) {
      for (const filePath of output.outputFilePaths) {
        lastThumbnailS3Path = filePath;
      }
    }
  }

  if (!lastThumbnailS3Path || !rootVideoS3Path) {
    await client
      .db()
      .collection(COLL_VIDEOS)
      .updateOne(
        { _id: finalMetadata.id },
        {
          $set: {
            status: uploadStatus.ENCODING_ERROR,
            errors: ['Missing thumbFilename or rootVideoFilename'],
          },
        }
      );
  } else {
    const thumbFilename = lastThumbnailS3Path.replace(/s3:\/\/[^/]+\//, '');
    const rootVideoFilename = rootVideoS3Path.replace(/s3:\/\/[^/]+\//, '');

    const thumbUrl = `https://${CDN_DOMAIN_NAME}/${thumbFilename}`;
    const url = `https://${CDN_DOMAIN_NAME}/${rootVideoFilename}`;
    const videoDoc = {
      filename: finalMetadata.name,
      isPublished: true,
      status: uploadStatus.READY,
      thumbFilename,
      thumbUrl,
      url,
    };

    await client
      .db()
      .collection(COLL_VIDEOS)
      .updateOne({ _id: finalMetadata.id }, { $set: videoDoc });
  }
}

async function handleError(
  event: MediaConvertEvent,
  finalMetadata: ManageVideoUserMetadata,
  { client }: { client: any }
) {
  const { errorMessage } = event.detail;

  await client
    .db()
    .collection(COLL_VIDEOS)
    .updateOne(
      { _id: finalMetadata.id },
      {
        $set: {
          status: uploadStatus.ENCODING_ERROR,
          errors: [errorMessage],
        },
      }
    );
}

async function handleCanceled(
  event: MediaConvertEvent,
  finalMetadata: ManageVideoUserMetadata,
  { client }: { client: any }
) {
  const { errorMessage } = event.detail;

  await client
    .db()
    .collection(COLL_VIDEOS)
    .updateOne(
      { _id: finalMetadata.id },
      {
        $set: {
          status: uploadStatus.ENCODING_ERROR,
          errors: ['Encoding canceled', errorMessage || ''],
        },
      }
    );
}

export default async (event: MediaConvertEvent): Promise<void> => {
  const client = await MongoClient.connect();

  try {
    const { status, jobId, userMetadata = {} } = event.detail;

    if (!userMetadata.id || !userMetadata.name) {
      console.warn(
        'MediaConvert Event missing userMetadata ID :',
        JSON.stringify(event, null, 2)
      );
      return;
    }

    const finalMetadata: ManageVideoUserMetadata = {
      id: userMetadata.id,
      name: userMetadata.name,
    };

    if (status === 'COMPLETE') {
      await handleComplete(event, finalMetadata, { client });
    } else if (status === 'ERROR') {
      await handleError(event, finalMetadata, { client });
    } else if (status === 'CANCELED') {
      await handleCanceled(event, finalMetadata, { client });
    } else if (status === 'PROGRESSING') {
      console.info(
        `Job ${jobId} is in progress (document ${JSON.stringify(finalMetadata)})`
      );
    } else {
      console.error(
        `Unhandled status ${status} :`,
        JSON.stringify(event, null, 2)
      );
    }
  } finally {
    await client.close();
  }
};
