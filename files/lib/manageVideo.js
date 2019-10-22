import ElasticTranscoder from 'aws-sdk/clients/elastictranscoder';
import path from 'path';
import { MongoClient } from 'mongodb';
import getCollectionFromContentType from '../lib/getCollectionFromContentType';
import uploadStatus from '../uploadStatus.json';
import settings from '../settings.json';

const {
  DB_NAME,
  EL_PIPELINE,
  MONGO_URL,
} = process.env;

const HLSVideos = [
  { vPath: 'hls-2M', presetId: '1351620000001-200010' },
  { vPath: 'hls-1.5M', presetId: '1351620000001-200020' },
  { vPath: 'hls-1M', presetId: '1351620000001-200030' },
  { vPath: 'hls-600k', presetId: '1351620000001-200040' },
  { vPath: 'hls-400k', presetId: '1351620000001-200050' },
];

export default async (bucket, object, file) => {
  console.log(bucket, object, file);
  // { name: 'slsupload-dev',
  // ownerIdentity: { principalId: 'A3QQWPM5AC1W26' },
  // arn: 'arn:aws:s3:::slsupload-dev' }

  // { key: 'eb3bfd48-2d07-4b1c-8227-e6dc0994d39c-SampleVideo_1280x720_1mb.mp4',
  // size: 1055736,
  // eTag: 'd55bddf8d62910879ed9f605522149a8',
  // sequencer: '005DA955FFC7917EC2' }

  // { AcceptRanges: 'bytes',
  // LastModified: 2019-10-18T06:04:48.000Z,
  // ContentLength: 1055736,
  // ETag: '"d55bddf8d62910879ed9f605522149a8"',
  // CacheControl: 'no-cache',
  // ContentType: 'video/mp4',
  // Metadata:
  //  { opts: '{"keepRatio":true}',
  //    appid: 'crowdaa_app_id',
  //    userid: 'dXZifsqv7i8Edt8nb',
  //    id: '7c51314b-397f-4856-a7ca-76c68eacf156' },
  // Body: <Buffer 00 00 00 20 66 74 79 70 69 73 6f 6d ... > }

  const client = await MongoClient.connect(MONGO_URL, {
    useNewUrlParser: true,
  });

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
    const collection = getCollectionFromContentType(type);
    const document = await client.db(DB_NAME)
      .collection(collection)
      .findOne({
        _id: id,
      });

    if (!document) {
      throw new Error('document_not_found');
    }

    if (type !== file.ContentType) {
      await client.db(DB_NAME)
        .collection(collection)
        .updateOne(
          { _id: document._id },
          { $set: { status: uploadStatus.UPLOAD_ERROR } },
        );
      throw new Error('content_type_mismatch');
    }

    const videoDoc = Object.assign(document, {
      _id: id,
      // "singer" : "dfbk",
      // "url" : "http://music-2068.kxcdn.com/VideoStorage/c7j4ic7FJm6xdEMLL-La_bande_de_Kev_Adams___C_a__vous___23_03_2017.mp4",
      // "filename" : "La_bande_de_Kev_Adams___C_a__vous___23_03_2017.mp4",
      // "videoCompressionStatus" : true,
      // "collection" : "video",
      // "isLinked" : true,
      title: title || '',
      profil_ID: null,
      views: 0,
      likes: 0,
      // "recorded" : "wdfkj",
      project_ID: null,
      // "distribution" : "3freePerDay",
      // "isLinkedToAudioID" : "knm65ar2WkGirF24R",
      // "video480Uploaded" : true,
      // "fileObj_ID" : "c7j4ic7FJm6xdEMLL",
      // "video480Url" : "http://music-2068.kxcdn.com/Video480Storage/87ybJMsaCK9N9NAfp-La_bande_de_Kev_Adams___C_a__vous___23_03_2017.mp4",
      // "price" : 4,
      // author: null,
      feat: null,
      // clients: [],
      releaseDate: null,

      // PICTURE UPLOADED
      // description: '',
      // mediumFilename: null,
      // mediumFileObj_ID: null,
      // mediumUrl: null,
      // pictureFilename: object.key,
      // pictureFileObj_ID: null,
      // pictureUrl: null,
      // thumbFilename: null,
      // thumbFileObj_ID: null,
      // thumbUrl: null,
      // selectedGenres: [],
      // isPublished: true,

      status: uploadStatus.ENCODING,
    });

    const elasticTranscoder = new ElasticTranscoder(settings);
    const videoPath = `${decodeURI(object.key).replace(/\+/gi, ' ')}`;
    const { dir, name } = path.parse(videoPath);
    const outputPath = `${dir && `${dir}/`}${name}`;
    const params = {
      PipelineId: EL_PIPELINE,
      Input: { Key: `VideoStorage/${videoPath}` },
      OutputKeyPrefix: `videos/${outputPath}/`,
      Outputs: HLSVideos.map(({ vPath, presetId }) => ({
        Key: `${vPath}/`,
        PresetId: presetId,
        SegmentDuration: '10',
      })),
      Playlists: [
        {
          Name: 'master',
          Format: 'HLSv3',
          OutputKeys: HLSVideos.map(({ vPath }) => `${vPath}/`),
        },
      ],
    };
    await elasticTranscoder.createJob(params).promise();

    // pictureDoc[`${params.docField}Filename`] = key;
    // pictureDoc[`${params.docField}Url`] = url;
    await client.db(DB_NAME)
      .collection(collection)
      .updateOne(
        { _id: document._id },
        { $set: videoDoc },
      );
  } finally {
    client.close();
  }
  return null;
};
