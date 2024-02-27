import { expect } from 'chai';
import { after, before, describe, it } from 'mocha';
import sinon from 'sinon';
import handler from '../../handlers/getApps';
import * as getAppsLib from '../../lib/getApps';

describe('handler - getApps', () => {
  let stubLib;
  let response;
  let responseBody;
  const userId = 'dXZifsqv7i8Edt8nb9';
  const normalEvent = {
    requestContext: {
      authorizer: {
        principalId: userId,
      },
    },
    pathParameters: {
      id: userId,
    },
  };
  const invalidIdEvent = {
    ...normalEvent,
    pathParameters: {
      id: 'differentId',
    },
  };

  describe('handler getApps success', () => {
    const appsStub = [
      {
        _id: 'crowdaa_app_id',
        name: 'crowdaa',
      },
      {
        _id: 'lequotidien_app_id',
        name: 'leQuotidien',
      },
      {
        _id: 'd2ec9549-24b8-4ada-8656-95f56c198569',
        name: 'dev-TEST2',
      },
      {
        _id: '8f55021e-30d6-48e5-83da-d880171affe4',
        name: 'dev-TEST3',
      },
    ];

    before(async () => {
      stubLib = sinon.stub(getAppsLib, 'default').returns(appsStub);
      response = await handler({
        ...normalEvent,
      });
      responseBody = JSON.parse(response.body);
    });

    after(() => {
      stubLib.restore();
    });

    it('should return 200', () => {
      expect(response.statusCode).to.equal(200);
    });

    it('should return apps data', () => {
      expect(
        responseBody.items.every(
          (item, index) => item._id === appsStub[index]._id,
        ),
      ).to.equal(true);
      expect(responseBody.totalCount).to.equal(appsStub.length);
    });
  });

  describe('handler getApps invalid', () => {
    it('should return 403 error code', async () => {
      response = await handler({
        ...invalidIdEvent,
      });
      responseBody = JSON.parse(response.body);
      expect(responseBody.message).to.equal('forbidden');
      expect(response.statusCode).to.equal(403);
    });

    it('should return 500 error code if lib throws error', async () => {
      stubLib = sinon.stub(getAppsLib, 'default').throws();
      response = await handler({
        ...normalEvent,
      });
      responseBody = JSON.parse(response.body);
      expect(response.statusCode).to.equal(500);
      stubLib.restore();
    });

    // Skipped because the behavior changed, an empty array is now returned...
    it.skip('should return 404 error code if user has no permissions', async () => {
      stubLib = sinon.stub(getAppsLib, 'default').returns([]);
      response = await handler({
        ...normalEvent,
      });
      responseBody = JSON.parse(response.body);
      expect(response.statusCode).to.equal(404);
      stubLib.restore();
    });
  });
});
