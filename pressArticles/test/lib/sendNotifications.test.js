import sinon from 'sinon';
import { MongoClient } from 'mongodb';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';

import AWSMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';

import { doSendNotifications } from '../../lib/sendNotifications';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const {
  MONGO_URL,
  DB_NAME,
  COLL_PUSH_NOTIFICATIONS,
} = process.env;

describe('lib - sendNotifications', () => {
  let spyMongo;
  let stubMongo;
  AWSMock.setSDKInstance(AWS);

  describe('success', () => {
    before(() => {
      spyMongo = spyMongoMethods([{
        _id: 'id',
        Platform: 'Android',
        EndpointArn: 'arn:aws:sns:us-west-2:630176884077:tes',
      }]);
      const fakeClient = {
        db: spyMongo.db,
        close: spyMongo.close,
      };
      stubMongo = sinon.stub(MongoClient, 'connect').returns(fakeClient);
      AWSMock.mock('SNS', 'publish', 'notification send');
    });

    it('should return successful : 1', async () => {
      const res = await doSendNotifications(
        'title',
        'myMessage',
        'crowdaa_app_id',
        'extraData',
      );
      expect(res).to.be.a('object');
      expect(res).to.deep.eq({ successful: 1 });
    });

    it('mongo connection done', () => {
      sinon.assert.calledWith(stubMongo, MONGO_URL);
      sinon.assert.calledWith(spyMongo.db, DB_NAME);
      sinon.assert.called(spyMongo.close);
    });

    it('should find endpoints', () => {
      sinon.assert.calledWith(spyMongo.collection, COLL_PUSH_NOTIFICATIONS);
      sinon.assert.called(spyMongo.find);
      sinon.assert.calledWith(
        spyMongo.find,
        spyMongo.find.getCall(0).args[0],
        spyMongo.find.getCall(0).args[1],
      );
      sinon.assert.called(spyMongo.toArray);
    });

    after(() => {
      AWSMock.restore();
      stubMongo.restore();
    });
  });
});
