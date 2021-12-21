import MongoClient from '../../libs/mongoClient';

const {
  COLL_FORMS,
} = process.env;

export default async (formId) => {
  const client = await MongoClient.connect();

  try {
    const dbForm = client.db().collection(COLL_FORMS);

    const form = await dbForm.findOne({ _id: formId });
    if (!form) {
      throw new Error('content_not_found');
    }

    return (form);
  } finally {
    client.close();
  }
};
