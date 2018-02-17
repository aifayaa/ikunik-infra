import { MongoClient } from 'mongodb';
import winston from 'winston';

const selectionFields = [
  'selectionName',
  'selectionDisplayName',
  'selectionFindQuery',
  'selectionOptionQuery',
  'date',
  'createAt',
  'selectionRank',
  'iconeThumbFileUrl',
  'updatedAt',
  'selectionCollection',
];

const doGetSelection = async (selectionId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const selection = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .aggregate([
        { $match: { _id: selectionId } },
        {
          $unwind: {
            path: '$content_IDs',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: 'audio',
            localField: 'content_IDs',
            foreignField: '_id',
            as: 'audio',
          },
        },
        {
          $lookup: {
            from: 'video',
            localField: 'content_IDs',
            foreignField: '_id',
            as: 'video',
          },
        },
        {
          $project: Object.assign({}, ...selectionFields.map(field => ({ [field]: `$${field}` })), {
            track: {
              $concatArrays: ['$audio', '$video'],
            },
          }),
        },
        {
          $unwind: {
            path: '$track',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: 'Project',
            localField: 'track.project_ID',
            foreignField: '_id',
            as: 'project',
          },
        },
        {
          $unwind: {
            path: '$project',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: Object.assign({}, ...selectionFields.map(field => ({ [field]: `$${field}` })), {
            contentId: {
              $ifNull: ['$project.highlight', '$track._id'],
            },
          }),
        },
        {
          $group: Object.assign({}, ...selectionFields.map(field => ({ [field]: { $first: `$${field}` } })), {
            _id: '$_id',
            content_IDs: { $push: '$contentId' },
          }),
        },
      ]).toArray();
    return selection[0];
  } finally {
    client.close();
  }
};

export const handleGetSelection = async (event, context, callback) => {
  try {
    const selectionId = event.pathParameters.id;
    const results = await doGetSelection(selectionId);
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    winston.error(e);
    const response = {
      statusCode: 500,
      message: e.message,
    };
    callback(null, response);
  }
};
