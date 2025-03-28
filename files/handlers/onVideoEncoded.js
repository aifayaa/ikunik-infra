/* eslint-disable import/no-relative-packages */
import S3 from 'aws-sdk/clients/s3';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import uploadStatus from '../uploadStatus.json';
import response from '../../libs/httpResponses/response.ts';

const { CDN_DOMAIN_NAME, S3_PICTURES_BUCKET } = process.env;

const { COLL_VIDEOS } = mongoCollections;

const s3 = new S3({
  signatureVersion: 'v4',
});

export default async (event) => {
  const { Message: message } = event.Records[0].Sns;

  const client = await MongoClient.connect();

  try {
    const {
      state,
      userMetadata,
      outputKeyPrefix,
      playlists = [],
      outputs = [],
    } = JSON.parse(message);
    const { id, name } = userMetadata;

    const document = await client.db().collection(COLL_VIDEOS).findOne({
      _id: id,
    });

    if (!document) {
      throw new Error('document_not_found');
    }

    if (state !== 'COMPLETED') {
      const rawErrors = []
        .concat(playlists, outputs)
        .filter(({ status = '' }) => status.toLowerCase() === 'error')
        .map(({ statusDetail }) => statusDetail);
      const errors = rawErrors
        .map((e) => {
          const parts = e.split(/:/g);
          parts.shift();
          return parts.join(':');
        })
        .reduce((acc, e) => {
          if (acc.indexOf(e) < 0) {
            acc.push(e);
          }
          return acc;
        }, []);
      await client
        .db()
        .collection(COLL_VIDEOS)
        .updateOne(
          { _id: id },
          {
            $set: {
              status: uploadStatus.ENCODING_ERROR,
              rawErrors,
              errors,
            },
          }
        );
      throw new Error('encoding_error');
    }

    // We need to remove unused thumbnails to save space, since one thumbnail
    // will be created for every 3 seconds of video
    const thumbnailPrefix = 'thumbnail-hq-';
    let thumbFilename = `${outputKeyPrefix}${thumbnailPrefix}00001.png`;
    try {
      let continuationToken = null;
      const toRemoveThumbnails = {};
      const keepFilenames = {
        [`${outputKeyPrefix}${thumbnailPrefix}00002.png`]: {
          found: false,
          priority: 2,
        },
        [`${outputKeyPrefix}${thumbnailPrefix}00001.png`]: {
          found: false,
          priority: 1,
        },
      };

      do {
        const query = {
          Bucket: S3_PICTURES_BUCKET,
          Prefix: `${outputKeyPrefix}${thumbnailPrefix}`,
        };
        if (continuationToken) query.ContinuationToken = continuationToken;
        // eslint-disable-next-line no-await-in-loop
        const videosObjects = await s3.listObjectsV2(query).promise();

        if (videosObjects.Contents) {
          videosObjects.Contents.forEach(({ Key }) => {
            if (!keepFilenames[Key]) {
              toRemoveThumbnails[Key] = true;
            } else {
              keepFilenames[Key].found = true;
            }
          });
        }

        if (videosObjects.isTruncated)
          continuationToken = videosObjects.NextContinuationToken;
        else continuationToken = null;
      } while (continuationToken);

      let keepKey = null;
      Object.keys(keepFilenames).forEach((key) => {
        if (keepFilenames[key].found) {
          if (!keepKey) {
            keepKey = key;
          } else if (
            keepFilenames[key].priority > keepFilenames[keepKey].priority
          ) {
            toRemoveThumbnails[keepKey] = true;
            keepKey = key;
          } else {
            toRemoveThumbnails[key] = true;
          }
        }
      });

      if (keepKey) {
        thumbFilename = keepKey;
      }

      const deleteParams = {
        Bucket: S3_PICTURES_BUCKET,
        Delete: {
          Objects: Object.keys(toRemoveThumbnails).map((Key) => ({ Key })),
        },
      };
      await s3.deleteObjects(deleteParams).promise();

      return response({ code: 200, body: 'ok' });
    } catch (e) {
      return response({ code: 500, body: `${e}` });
    } finally {
      // this should be done in a better way ..
      const thumbUrl = `https://${CDN_DOMAIN_NAME}/${thumbFilename}`;
      const url = `https://${CDN_DOMAIN_NAME}/${outputKeyPrefix}master.m3u8`;
      const videoDoc = {
        filename: name,
        isPublished: true,
        status: uploadStatus.READY,
        thumbFilename,
        thumbUrl,
        url,
      };

      await client
        .db()
        .collection(COLL_VIDEOS)
        .updateOne({ _id: userMetadata.id }, { $set: videoDoc });
    }
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
