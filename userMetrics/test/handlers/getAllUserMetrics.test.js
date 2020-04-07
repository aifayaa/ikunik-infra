import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import * as lib from '../../lib/getAllUserMetrics';
import handler from '../../handlers/getAllUserMetrics';

describe('handlers - getAllUserMetrics', () => {
  let stubLib;
  const event = {
    requestContext: {
      authorizer: {
        perms: JSON.stringify({}),
        appId: 'crowdaa_app_id',
      },
    },
    queryStringParameters: {
      userId: 'userId',
      type: 'time',
      contentId: 'contentId',
      contentCollection: 'contentCollection',
      start: '0',
      limit: '10',
      startTime: 'startTime',
      endTime: 'endTime',
      latitude: 'latitude',
      longitude: 'longitude',
      range: 'range',
    },
  };
  const sandbox = sinon.createSandbox();

  describe('error', () => {
    describe('wrong argument type', () => {
      before(() => {
        stubLib = sandbox.stub(lib, 'default').throws();
      });

      /* Loop test for all arguments */
      Object.keys(event.queryStringParameters).forEach((key) => {
        if (!(['start', 'limit'].indexOf(key) + 1)) {
          it(`wrong type for ${key}`, async () => {
            const testEvent = JSON.parse(JSON.stringify(event));
            testEvent.queryStringParameters[key] = 1;
            const response = await handler(testEvent);
            const { message } = JSON.parse(response.body);
            expect(response.statusCode).to.equal(500);
            expect(message).to.equal('Wrong argument type');
          });
        }
      });

      it('wrong type for start', async () => {
        const testEvent = JSON.parse(JSON.stringify(event));
        testEvent.queryStringParameters.start = '1r5';
        const response = await handler(testEvent);
        const { message } = JSON.parse(response.body);
        expect(response.statusCode).to.equal(500);
        expect(message).to.equal('Wrong argument type');
      });

      it('wrong type for limit', async () => {
        const testEvent = JSON.parse(JSON.stringify(event));
        testEvent.queryStringParameters.limit = '1r5';
        const response = await handler(testEvent);
        const { message } = JSON.parse(response.body);
        expect(response.statusCode).to.equal(500);
        expect(message).to.equal('Wrong argument type');
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('other errors', () => {
      before(() => {
        stubLib = sandbox.stub(lib, 'default').throws();
      });

      it('start less than zero', async () => {
        const testEvent = JSON.parse(JSON.stringify(event));
        testEvent.queryStringParameters.start = '-3';
        const response = await handler(testEvent);
        const { message } = JSON.parse(response.body);
        expect(response.statusCode).to.equal(500);
        expect(message).to.equal('Start cannot be less than zero');
      });

      it('limit less than one', async () => {
        const testEvent = JSON.parse(JSON.stringify(event));
        testEvent.queryStringParameters.limit = '0';
        const response = await handler(testEvent);
        const { message } = JSON.parse(response.body);
        expect(response.statusCode).to.equal(500);
        expect(message).to.equal('Limit cannot be less than one');
      });

      it('unavailable type', async () => {
        const testEvent = JSON.parse(JSON.stringify(event));
        testEvent.queryStringParameters.type = 'unavailable_type';
        const response = await handler(testEvent);
        const { message } = JSON.parse(response.body);
        expect(response.statusCode).to.equal(500);
        expect(message).to.equal('This type is not available');
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('lib fail', () => {
      const libResult = new Error('lib method fail');

      before(() => {
        stubLib = sandbox.stub(lib, 'default').callsFake(() => Promise.reject(libResult));
      });

      it('should return 500', async () => {
        const response = await handler(event);
        expect(response.statusCode).to.eq(500);
      });

      after(() => {
        sandbox.restore();
      });
    });
  });

  describe('lib success', () => {
    const libResult = [
      {},
      {},
    ];

    before(() => {
      stubLib = sandbox.stub(lib, 'default').returns(libResult);
    });

    it('should return 200', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(200);
      expect(JSON.parse(response.body)).to.deep.eq(libResult);
    });

    it('should called with the good args', () => {
      const {
        userId,
        type,
        contentId,
        contentCollection,
        start,
        limit,
        startTime,
        endTime,
        latitude,
        longitude,
        range,
      } = event.queryStringParameters;
      const { appId } = event.requestContext.authorizer;
      sinon.assert.calledWith(
        stubLib,
        appId,
        userId,
        type,
        contentId,
        contentCollection,
        start,
        limit,
        startTime,
        endTime,
        latitude,
        longitude,
        range,
      );
    });

    after(() => {
      sandbox.restore();
    });
  });
});
