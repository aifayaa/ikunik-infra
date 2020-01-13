import isEmpty from 'lodash/isEmpty';
import omitBy from 'lodash/omitBy';
import zipObject from 'lodash/zipObject';
import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_ARTISTS,
  COLL_AUDIOS,
  COLL_PROJECTS,
  COLL_SELECTIONS,
  COLL_VIDEOS,
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
      from: COLL_PROJECTS,
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
      from: COLL_PROJECTS,
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
      searchMedia(client.db(DB_NAME).collection(COLL_AUDIOS), text, appId),
      searchMedia(client.db(DB_NAME).collection(COLL_VIDEOS), text, appId),
      searchArtists(client.db(DB_NAME).collection(COLL_ARTISTS), text, appId),
      client.db(DB_NAME).collection(COLL_PROJECTS).find(query).toArray(),
      client.db(DB_NAME).collection(COLL_SELECTIONS).find(query).toArray(),
    ]);
    return omitBy(zipObject(['audios', 'videos', 'artists', 'projects', 'selections'], results), isEmpty);
  } finally {
    client.close();
  }
};
