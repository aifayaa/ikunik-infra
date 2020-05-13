import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_USERS,
  COLL_APPS,
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

// TODO: intl
export default async (userId, appId, contentId, reason, details) => {
  const client = await MongoClient.connect();
  try {
    const [user, app, content] = await Promise.all([
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
      client
        .db(DB_NAME)
        .collection(COLL_USER_GENERATED_CONTENTS)
        .findOne({
          _id: contentId,
        }, { projection: { data: true } }),
    ]);

    return {
      body: `
        <body>
        <h3>A content has been reported by user <strong>${user._id}</strong>
        named <strong>${user.profile.username}</strong> on app <strong>${app.name}</strong></h3><br>
        <p><strong>reported content:</strong></p>
        <p>
          <q>${JSON.stringify(content.data, null, 2)}</q>
        </p>
        <p><strong>reported reason: </strong><q> ${reason} </strong></p>
        <p><strong>reported details: </strong></p> 
        <p>
          <q>${details}</q>
        </p>
        <br>
        The Crowdaa team.
        </body>
      `,
      subject: `A User has report an UGC on app ${app.name}`,
    };
  } finally {
    client.close();
  }
};
