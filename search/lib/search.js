import isEmpty from 'lodash/isEmpty';
import omitBy from 'lodash/omitBy';
import zipObject from 'lodash/zipObject';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_ARTISTS,
  COLL_AUDIOS,
  COLL_PROJECTS,
  COLL_SELECTIONS,
  COLL_VIDEOS,
} = mongoCollections;

const searchArtists = (collection, text, appId) => collection.aggregate([
  {
    $match: {
      $text: { $search: text },
      appId,
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

const searchMedia = (collection, text, appId) => collection.aggregate([
  {
    $match: {
      $text: { $search: text },
      appId,
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
  const client = await MongoClient.connect();
  const query = {
    $text: { $search: text },
    appId,
  };
  try {
    const results = await Promise.all([
      searchMedia(client.db().collection(COLL_AUDIOS), text, appId),
      searchMedia(client.db().collection(COLL_VIDEOS), text, appId),
      searchArtists(client.db().collection(COLL_ARTISTS), text, appId),
      client.db().collection(COLL_PROJECTS).find(query).toArray(),
      client.db().collection(COLL_SELECTIONS).find(query).toArray(),
    ]);
    return omitBy(zipObject(['audios', 'videos', 'artists', 'projects', 'selections'], results), isEmpty);
  } finally {
    client.close();
  }
};
