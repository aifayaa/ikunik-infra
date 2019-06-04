import { MongoClient, ObjectID } from 'mongodb';

export default async (userId, appId, name, pathName, color) => {

    /* Check for parameters */
    if (
        typeof name !== 'string'
        || typeof pathName !== 'string'
        || typeof color !== 'string'
    ) {
        throw new Error('bad arguments');
    }

    /* Mongo client */
    const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });

    try {

        /* Request for categories having the same appId */
        const categories = await client.db(process.env.DB_NAME)
            .collection(process.env.COLL_PRESS_CATEGORIES)
            .find({
                appIds: { $elemMatch: { $eq: appId } },
            }, { sort: { name: -1 } })
            .toArray();
        
        /* Check if those categories already have the same pathName and throw an error if so */
        let errors = [];
        for(var k in categories) {
            if(categories[k].pathName == pathName) {
                errors.push("Pathname " + pathName + " already exists for appId " + appId);
            }
        }

        if (errors.length) throw new Error('Errors: ' + errors.join('\n'));
        
        /* Otherwise, insert the category to the database and return it */
        const category = {
            _id: new ObjectID().toString(),
            "name" : name,
            "pathName" : pathName,
            "color" : color,
            "appIds" : [ appId ],
        };

        const _id = await client
            .db(process.env.DB_NAME)
            .collection(process.env.COLL_PRESS_CATEGORIES)
            .insertOne(category);
        
        return { _id, ...category };

    } finally {
        client.close();
    }
};
