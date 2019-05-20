import isEmpty from 'lodash/isEmpty';
import omitBy from 'lodash/omitBy';
import zipObject from 'lodash/zipObject';
import { MongoClient } from 'mongodb';

const {
  PROJECTS,
  MONGO_URL,
  DB_NAME,
} = process.env;

const searchArtists = async (collection, text, appId) => collection.aggregate([
  {
    $match: {
      $text: { $search: text },
      appIds: { $elemMatch: { $eq: appId } },
    },
  },
  { $limit: 10 },

  {
    $addFields: {
      projectId: { $ifNull: [{ $arrayElemAt: ['$project_IDs', 0] }, '$project_ID'] },
    },
  },
  {
    $lookup: {
      from: PROJECTS,
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

const searchMedia = async (collection, text, appId) => collection.aggregate([
  {
    $match: {
      $text: { $search: text },
      appIds: { $elemMatch: { $eq: appId } },
    },
  },
  { $limit: 10 },
  {
    $lookup: {
      from: PROJECTS,
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

export default async (text, appId) => {
  const client = await MongoClient.connect(MONGO_URL);
  const query = {
    $text: { $search: text },
    appIds: { $elemMatch: { $eq: appId } },
  };
  try {
    const results = await Promise.all([
      searchMedia(client.db(DB_NAME).collection('audio'), text, appId),
      searchMedia(client.db(DB_NAME).collection('video'), text, appId),
      searchArtists(client.db(DB_NAME).collection('artists'), text, appId),
      client.db(DB_NAME).collection('Project').find(query).toArray(),
      client.db(DB_NAME).collection('selection').find(query).toArray(),
    ]);
    return omitBy(zipObject(['audios', 'videos', 'artists', 'projects', 'selections'], results), isEmpty);
  } finally {
    client.close();
  }
};
