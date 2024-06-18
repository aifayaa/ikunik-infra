/* eslint-disable import/no-relative-packages */
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { UserType } from '../../users/lib/userEntity';

const { COLL_USERS } = mongoCollections;

const bcryptRounds = 10;

const sha256 = (value: crypto.BinaryLike) =>
  crypto.createHash('sha256').update(value).digest('hex');

// extracted from meteor accounts-password module
// https://github.com/meteor/meteor/blob/devel/packages/accounts-password/password_server.js

// Given a 'password' from the client, extract the string that we should
// bcrypt. 'password' can be one of:
//  - String (the plaintext password)
//  - Object with 'digest' and 'algorithm' keys. 'algorithm' must be "sha-256".
//
export const getPasswordString = (
  password: string | { algorithm: string; digest: string }
) => {
  if (typeof password === 'string') {
    password = sha256(password);
  } else {
    // 'password' is an object
    if (password.algorithm !== 'sha-256') {
      throw new Error(
        "Invalid password hash algorithm. Only 'sha-256' is allowed."
      );
    }
    password = password.digest;
  }
  return password;
};

// Use bcrypt to hash the password for storage in the database.
// `password` can be a string (in which case it will be run through
// SHA256 before bcrypt) or an object with properties `digest` and
// `algorithm` (in which case we bcrypt `password.digest`).
//
export const hashPassword = (
  password: string | { algorithm: string; digest: string }
) => {
  password = getPasswordString(password);
  return bcrypt.hash(password, bcryptRounds);
};

// Extract the number of rounds used in the specified bcrypt hash.
export const getRoundsFromBcryptHash = (hash?: string) => {
  let rounds;
  if (hash) {
    const hashSegments = hash.split('$');
    if (hashSegments.length > 2) {
      rounds = parseInt(hashSegments[2], 10);
    }
  }
  return rounds;
};

export const checkPassword = async (
  user: UserType,
  password: string | { algorithm: string; digest: string },
  { mongoClient }: { mongoClient?: unknown } = {}
) => {
  const formattedPassword = getPasswordString(password);
  const hash = user.services.password?.bcrypt;
  const hashRounds = getRoundsFromBcryptHash(hash);

  if (hash && !(await bcrypt.compare(formattedPassword, hash))) {
    throw new Error('incorrect_password');
  } else if (hash && bcryptRounds !== hashRounds) {
    // The password checks out, but the user's bcrypt hash needs to be updated.

    const openClient = !!mongoClient;

    let mongoClientInstance;

    if (openClient) {
      // initiate mongodb connection if no client given in options
      mongoClientInstance = await MongoClient.connect();
    } else {
      mongoClientInstance = mongoClient;
    }
    try {
      await mongoClientInstance
        .db()
        .collection(COLL_USERS)
        .updateOne(
          { _id: user._id },
          {
            $set: {
              'services.password.bcrypt': await bcrypt.hash(
                formattedPassword,
                bcryptRounds
              ),
            },
          }
        );
    } finally {
      if (openClient) {
        mongoClientInstance.close();
      }
    }
  }
};
