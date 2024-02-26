import jsonata from 'jsonata';
import request from 'request-promise-native';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_USERS,
} = mongoCollections;

function promiseExecUntilTrue(exec) {
  return (new Promise((resolve, reject) => {
    const process = (ret) => {
      if (ret === true) {
        resolve();
      } else {
        exec().then(process).catch(reject);
      }
    };

    process();
  }));
}

function objGet(obj, keys, dft) {
  let keysArray = keys;
  let ret = obj;
  if (typeof keys === 'string') {
    keysArray = keys.split('.');
  } else {
    keysArray = Array.prototype.slice.call(keys);
  }

  while (keysArray.length > 0) {
    try {
      const key = keysArray.shift();
      ret = ret[key];
    } catch (e) {
      return (dft);
    }
  }

  if (ret === undefined) return (dft);

  return (ret);
}

export default async function postLoginChecks(ret, app, checksOn) {
  const client = await MongoClient.connect();

  try {
    const { userId } = ret;
    const usersCollection = client.db().collection(COLL_USERS);

    if (app.settings.userDataCollection) {
      const userDataCollection = [...app.settings.userDataCollection];

      await promiseExecUntilTrue(async () => {
        if (userDataCollection.length === 0) {
          return (true);
        }

        const collectSettings = userDataCollection.shift();

        const user = await usersCollection.findOne({ _id: userId, appId: app._id });
        const lookupData = { user, app };

        const autoReplaceUserKeys = (string) => {
          const replaced = string.replace(/{{([^}|]+)(?:\|([^}|]+))?}}/g, (_wholematch, key, dftVal) => {
            if (!dftVal) dftVal = '';
            const replacement = objGet(lookupData, key, dftVal);
            return (replacement);
          });

          return (replaced);
        };

        const {
          extraRequestFields = null,
          headers = {},
          method = 'GET',
          url,
          dataMapping,
          jsonataQuery = null,
          on = {},
        } = collectSettings;

        if (!on[checksOn]) {
          return (false);
        }

        const queryParams = {
          method,
        };

        queryParams.uri = autoReplaceUserKeys(url);

        queryParams.headers = Object.keys(headers).reduce((acc, rawKey) => {
          const key = autoReplaceUserKeys(rawKey);
          const val = autoReplaceUserKeys(headers[rawKey]);
          acc[key] = val;
          return (acc);
        }, {});

        if (extraRequestFields) {
          Object.keys(extraRequestFields).forEach((key) => {
            queryParams[key] = extraRequestFields[key];
          });
        }

        let response = null;
        try {
          const rawResponse = await request(queryParams);
          if (!rawResponse) return (false);
          response = (typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse);
        } catch (e) {
          if (e.statusCode !== 404) {
            /** Failing silently here, it should not be too much of a problem */
            // eslint-disable-next-line no-console
            console.error('postLoginChecks() error on query', queryParams, ':', e);
          }
          return (false);
        }

        const dbOps = {};
        let pendingOps = false;

        if (dataMapping) {
          Object.keys(dataMapping).forEach((mapKey) => {
            const mapVal = dataMapping[mapKey];

            const toSetVal = objGet(response, mapKey, null);
            if (toSetVal !== null) {
              if (!dbOps.$set) dbOps.$set = {};
              dbOps.$set[mapVal] = toSetVal;
              pendingOps = true;
            }
          });
        }

        if (jsonataQuery) {
          lookupData.dbOps = dbOps;
          lookupData.response = response;
          const expression = jsonata(jsonataQuery);
          const result = await expression.evaluate(lookupData);
          if (result && typeof result === 'object') {
            Object.keys(result).forEach((key) => {
              if (!dbOps[key]) {
                dbOps[key] = result[key];
                pendingOps = true;
              } else {
                Object.keys(result[key]).forEach((key2) => {
                  dbOps[key][key2] = result[key][key2];
                  pendingOps = true;
                });
              }
            });
          }
        }

        if (pendingOps) {
          await usersCollection.updateOne({
            _id: userId,
            appId: app._id,
          }, dbOps);
        }

        return (false);
      });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('postLoginChecks() error', e);
  } finally {
    client.close();
  }
}
