import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_USERS,
  COLL_APPS,
} = process.env;

// TODO: intl
export default async (userId, appId, data, { isEdition = false } = {}) => {
  const client = await MongoClient.connect();
  try {
    const [user, app] = await Promise.all([
      client
        .db(DB_NAME)
        .collection(COLL_USERS)
        .findOne({
          _id: userId,
          appIds: appId,
        }, { projection: { 'profile.username': true } }),
      client
        .db(DB_NAME)
        .collection(COLL_APPS)
        .findOne({
          _id: appId,
        }, { projection: { name: true } }),
    ]);

    return {
      body: `
        <body>
        <h3>A new UGC has been ${isEdition ? 'edited' : 'posted'} by <strong>${user._id}</strong>
        named <strong>${user.profile.username}</strong> on app <strong>${app.name}</strong></h3><br>
        <h3> details: </h3>
        <p>
          ${JSON.stringify(data, null, 2)}
        </p>
        <br>
        The Crowdaa team.
        </body>
      `,
      subject: `A new UGC has been ${isEdition ? 'edited' : 'posted'} on app ${app.name}`,
    };
  } finally {
    client.close();
  }
};
