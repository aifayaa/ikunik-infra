import ElasticTranscoder from 'aws-sdk/clients/elastictranscoder';
import path from 'path';
import MongoClient from '../../libs/mongoClient';
import getCollectionFromContentType from './getCollectionFromContentType';
import uploadStatus from '../uploadStatus.json';

const {
  DB_NAME,
  EL_PIPELINE,
} = process.env;

/* Encoding parameters */
const HLSVideos = [
  /* hls-2M is copied from default one, using HQ thumbnails */
  { vPath: 'hls-2M', presetId: '1573190421735-3iyjy4' },
  /* All other presets are the defaults ones */
  { vPath: 'hls-1.5M', presetId: '1351620000001-200020' },
  { vPath: 'hls-1M', presetId: '1351620000001-200030' },
  { vPath: 'hls-600k', presetId: '1351620000001-200040' },
  { vPath: 'hls-400k', presetId: '1351620000001-200050' },
];

export default async (bucket, object, file) => {
  const client = await MongoClient.connect();

  /* all key names are lowercaser in metadata */
  const {
    id,
    title,
    type,
  } = file.Metadata;

  if (!id) {
    throw new Error('missing_id');
  }

  try {
    /* Get existing document and check it exists */
    const collection = getCollectionFromContentType(type);
    const document = await client.db(DB_NAME)
      .collection(collection)
      .findOne({
        _id: id,
      });

    if (!document) {
      throw new Error('document_not_found');
    }

    /* Check content type match */
    if (type !== file.ContentType) {
      await client.db(DB_NAME)
        .collection(collection)
        .updateOne(
          { _id: document._id },
          { $set: { status: uploadStatus.UPLOAD_ERROR } },
        );
      throw new Error('content_type_mismatch');
    }

    /* Update video document with more info and status */
    const videoDoc = Object.assign(document, {
      _id: id,
      title: title || '',
      profil_ID: null,
      views: 0,
      likes: 0,
      project_ID: null,
      feat: null,
      releaseDate: null,
      status: uploadStatus.ENCODING,
    });

    await client.db(DB_NAME)
      .collection(collection)
      .updateOne(
        { _id: document._id },
        { $set: videoDoc },
      );

    /* Proceed to encoding */
    const elasticTranscoder = new ElasticTranscoder();
    const videoPath = `${decodeURI(object.key).replace(/\+/gi, ' ')}`;
    const { name } = path.parse(videoPath);
    const params = {
      PipelineId: EL_PIPELINE,
      Input: { Key: videoPath },
      OutputKeyPrefix: `videos/${name}/`,
      Outputs: HLSVideos.map(({ vPath, presetId }) => ({
        Key: `${vPath}/`,
        PresetId: presetId,
        SegmentDuration: '10',
        ThumbnailPattern: '{count}',
      })),
      Playlists: [
        {
          Name: 'master',
          Format: 'HLSv3',
          OutputKeys: HLSVideos.map(({ vPath }) => `${vPath}/`),
        },
      ],
      UserMetadata: {
        id,
        name,
      },
    };

    try {
      await elasticTranscoder.createJob(params).promise();
    } catch (e) {
      await client.db(DB_NAME)
        .collection(collection)
        .updateOne(
          { _id: document._id },
          { $set: {
            message: e.message,
            status: uploadStatus.ENCODING_JOB_ERROR,
          } },
        );
    }
  } finally {
    client.close();
  }
  return null;
};
