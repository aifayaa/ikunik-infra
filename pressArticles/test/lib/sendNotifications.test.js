import sinon from 'sinon';
import { before, describe, it, after } from 'mocha';
import { expect } from 'chai';

import AWSMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import MongoClient from '../../../libs/mongoClient';
import mongoCollections from '../../../libs/mongoCollections.json';

import { sendNotificationTo } from '../../lib/snsNotifications';
import spyMongoMethods from '../../../libs/test/spyMongoMethods';

const { COLL_PUSH_NOTIFICATIONS } = mongoCollections;

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

    // TODO: FIX TEST (Notifications changes)
    // TODO: Also add tests for the new handler called by AWS StateFunctions
    it.skip('should return successful : 1', async () => {
      const res = await sendNotificationTo({
        title: 'title',
        message: 'message',
        endpoint: { Platform: 'DoesNotExist', EndpointArn: 'some:arn' },
        extraData: {},
      });
      expect(res).to.be.a('object');
      expect(res).to.deep.eq({ successful: 1 });
    });

    // TODO: FIX TEST (Notifications changes)
    it.skip('mongo connection done', () => {
      sinon.assert.calledWith(spyMongo.db);
      sinon.assert.called(spyMongo.close);
    });

    // TODO: FIX TEST (Notifications changes)
    it.skip('should find endpoints', () => {
      sinon.assert.calledWith(spyMongo.collection, COLL_PUSH_NOTIFICATIONS);
      sinon.assert.called(spyMongo.find);
      sinon.assert.calledWith(
        spyMongo.find,
        spyMongo.find.getCall(0).args[0],
        spyMongo.find.getCall(0).args[1],
      );
      sinon.assert.called(spyMongo.forEach);
    });

    after(() => {
      AWSMock.restore();
      stubMongo.restore();
    });
  });
});
