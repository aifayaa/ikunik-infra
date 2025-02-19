/* eslint-disable import/no-relative-packages */
import ElasticTranscoder from 'aws-sdk/clients/elastictranscoder';
import path from 'path';
import MongoClient from '../../libs/mongoClient';
import getCollectionFromContentType from './getCollectionFromContentType';
import uploadStatus from '../uploadStatus.json';
import transcoderPresets from './elasticTranscoderPresets.json';

const { EL_PIPELINE, EL_PIPELINE_REGION, STAGE } = process.env;

/* Encoding parameters */
const HLSVideos = transcoderPresets[`${STAGE}.${EL_PIPELINE_REGION}`];

export default async (bucket, object, file) => {
  const client = await MongoClient.connect();

  /* all key names are lowercaser in metadata */
  const { id, title, type } = file.Metadata;

  if (!id) {
    throw new Error('missing_id');
  }

  try {
    /* Get existing document and check it exists */
    const collection = getCollectionFromContentType(type);
    const document = await client.db().collection(collection).findOne({
      _id: id,
    });

    if (!document) {
      throw new Error('document_not_found');
    }

    /* Check content type match */
    if (type !== file.ContentType) {
      await client
        .db()
        .collection(collection)
        .updateOne(
          { _id: document._id },
          { $set: { status: uploadStatus.UPLOAD_ERROR } }
        );
      throw new Error('content_type_mismatch');
    }

    /* Update video document with more info and status */
    const videoDoc = Object.assign(document, {
      _id: id,
      title: title || '',
      status: uploadStatus.ENCODING,
    });

    await client
      .db()
      .collection(collection)
      .updateOne({ _id: document._id }, { $set: videoDoc });

    /* Proceed to encoding */
    const elasticTranscoder = new ElasticTranscoder({
      region: EL_PIPELINE_REGION,
      endpoint: `https://elastictranscoder.${EL_PIPELINE_REGION}.amazonaws.com`,
    });
    const videoPath = `${decodeURI(object.key).replace(/\+/gi, ' ')}`;
    const { name } = path.parse(videoPath);
    const params = {
      PipelineId: EL_PIPELINE,
      Input: { Key: videoPath },
      OutputKeyPrefix: `videos/${name}/`,
      Outputs: HLSVideos.map(({ vPath, presetId, thumbnailName }) => ({
        Key: `${vPath}/`,
        PresetId: presetId,
        SegmentDuration: '10',
        ThumbnailPattern: thumbnailName,
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
      await client
        .db()
        .collection(collection)
        .updateOne(
          { _id: document._id },
          {
            $set: {
              message: e.message,
              status: uploadStatus.ENCODING_JOB_ERROR,
            },
          }
        );
    }
  } finally {
    client.close();
  }
  return null;
};
