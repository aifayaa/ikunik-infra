/* eslint-disable import/no-relative-packages */
import jsonata from 'jsonata';
import request from 'request-promise-native';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { AppType } from '../../apps/lib/appEntity';
import { UserType } from '../../users/lib/userEntity';

const { COLL_USERS } = mongoCollections;

function promiseExecUntilTrue(exec: () => Promise<boolean>) {
  return new Promise((resolve, reject) => {
    const process = (ret: boolean | void) => {
      if (ret === true) {
        resolve(true);
      } else {
        exec().then(process).catch(reject);
      }
    };

    process();
  }) as Promise<boolean>;
}

function objGet(
  obj: { [key: string]: unknown },
  keys: string | Array<string>,
  defaultValue: unknown
) {
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
      ret = ret[key!] as { [key: string]: unknown };
    } catch (e) {
      return defaultValue;
    }
  }

  if (ret === undefined) return defaultValue;

  return ret;
}

export default async function postLoginChecks(
  ret: { [key: string]: unknown },
  app: AppType,
  checksOn: 'saml-login' | 'admin-register'
) {
  const client = await MongoClient.connect();

  try {
    const { userId } = ret;
    const usersCollection = client.db().collection(COLL_USERS);

    if (app.settings.userDataCollection) {
      const userDataCollection = [...app.settings.userDataCollection];

      await promiseExecUntilTrue(async () => {
        if (userDataCollection.length === 0) {
          return true;
        }

        const collectSettings = userDataCollection.shift()!;

        const user = await usersCollection.findOne({
          _id: userId,
          appId: app._id,
        });
        const lookupData: {
          user: UserType;
          app: AppType;
          dbOps?: { [key: string]: { [key: string]: string } };
          response?: any;
        } = { user, app };

        const autoReplaceUserKeys = (str: string) => {
          const replaced = str.replace(
            /{{([^}|]+)(?:\|([^}|]+))?}}/g,
            (_wholematch: string, key: string, dftVal: string) => {
              if (!dftVal) dftVal = '';
              const replacement = objGet(lookupData, key, dftVal) as string;
              return replacement;
            }
          );

          return replaced;
        };

        const {
          extraRequestFields = null,
          headers = {} as {
            // auth_token?: string;
            [key: string]: string;
          },
          method = 'GET',
          url,
          dataMapping,
          jsonataQuery = null,
          on = {} as {
            'saml-login': boolean;
          },
        } = collectSettings;

        if (!on[checksOn]) {
          return false;
        }

        const queryParams = {
          method,
        } as {
          method: string;
          uri: string;
          headers: { [key: string]: string };
          [key: string]: string | { [key: string]: string };
        };

        queryParams.uri = autoReplaceUserKeys(url);

        queryParams.headers = Object.keys(headers).reduce(
          (acc, rawKey) => {
            const key = autoReplaceUserKeys(rawKey);
            const val = autoReplaceUserKeys(headers[rawKey]);
            acc[key] = val;
            return acc;
          },
          {} as { [key: string]: string }
        );

        if (extraRequestFields) {
          Object.keys(extraRequestFields).forEach((key) => {
            queryParams[key] = extraRequestFields[key];
          });
        }

        let response = null;
        try {
          const rawResponse = await request(queryParams);
          if (!rawResponse) return false;
          response =
            typeof rawResponse === 'string'
              ? JSON.parse(rawResponse)
              : rawResponse;
        } catch (e: any) {
          if (e.statusCode) {
            if (e.statusCode !== 404) {
              /** Failing silently here, it should not be too much of a problem */
              // eslint-disable-next-line no-console
              console.error(
                'postLoginChecks() error on query',
                queryParams,
                ':',
                e
              );
            }
          }
          return false;
        }

        const dbOps: { [key: string]: { [key: string]: string } } = {};
        let pendingOps = false;

        if (dataMapping) {
          Object.keys(dataMapping).forEach((mapKey) => {
            const mapVal = dataMapping[mapKey];

            const toSetVal = objGet(response, mapKey, null) as string;
            if (toSetVal !== null) {
              if (!dbOps.$set) dbOps.$set = {} as { [key: string]: string };
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
          await usersCollection.updateOne(
            {
              _id: userId,
              appId: app._id,
            },
            dbOps
          );
        }

        return false;
      });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('postLoginChecks() error', e);
  } finally {
    client.close();
  }
}
