import isEmpty from 'lodash/isEmpty';
import omitBy from 'lodash/omitBy';
import zipObject from 'lodash/zipObject';
import { MongoClient } from 'mongodb';

const searchArtists = async (collection, text) => collection.aggregate([
  { $match: { $text: { $search: text } } },
  { $limit: 10 },

  {
    $addFields: {
      projectId: { $ifNull: [{ $arrayElemAt: ['$project_IDs', 0] }, '$project_ID'] },
    },
  },
  {
    $lookup: {
      from: 'Project',
      localField: 'projectId',
      foreignField: '_id',
      as: 'project',
    },
  },
  {
    $unwind: {
      path: '$project',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $project: {
      artistName: '$artistName',
      iconeThumbFileUrl: '$project.iconeThumbFileUrl',
    },
  },
]).toArray();

const searchMedia = async (collection, text) => collection.aggregate([
  { $match: { $text: { $search: text } } },
  { $limit: 10 },
  {
    $lookup: {
      from: 'Project',
      localField: 'project_ID',
      foreignField: '_id',
      as: 'project',
    },
  },
  {
    $unwind: {
      path: '$project',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $project: {
      title: '$title',
      author: '$author',
      projectThumbFileUrl: '$project.iconeThumbFileUrl',
    },
  },
]).toArray();

export default async (text) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  const { DB_NAME } = process.env;
  try {
    const results = await Promise.all([
      searchMedia(client.db(DB_NAME).collection('audio'), text),
      searchMedia(client.db(DB_NAME).collection('video'), text),
      searchArtists(client.db(DB_NAME).collection('artists'), text),
      client.db(DB_NAME).collection('Project').find({ $text: { $search: text } }).toArray(),
      client.db(DB_NAME).collection('selection').find({ $text: { $search: text } }).toArray(),
    ]);
    return omitBy(zipObject(['audios', 'videos', 'artists', 'projects', 'selections'], results), isEmpty);
  } finally {
    client.close();
  }
};
