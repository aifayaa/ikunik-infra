/* eslint-disable import/no-relative-packages */
import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import * as lib from '../../lib/identifyUserMetrics';
import handler from '../../handlers/identifyUserMetrics';

describe('handlers - identifyUserMetrics', () => {
  let stubLib;
  const event = {
    requestContext: {
      authorizer: {
        appId: 'crowdaa_app_id',
        perms: JSON.stringify({}),
        principalId: 'userId',
      },
    },
    pathParameters: {
      id: 'deviceId',
    },
  };
  const sandbox = sinon.createSandbox();

  describe('lib error', () => {
    describe('wrong argument type', () => {
      before(() => {
        stubLib = sandbox.stub(lib, 'default').throws();
      });

      it('deviceId is missing', async () => {
        const testEvent = JSON.parse(JSON.stringify(event));
        delete testEvent.pathParameters.id;
        const response = await handler(testEvent);
        const { message } = JSON.parse(response.body);
        expect(response.statusCode).to.equal(500);
        expect(message).to.equal('missing_arguments');
      });

      it('wrong type for deviceId', async () => {
        const testEvent = JSON.parse(JSON.stringify(event));
        testEvent.pathParameters.id = 1;
        const response = await handler(testEvent);
        const { message } = JSON.parse(response.body);
        expect(response.statusCode).to.equal(500);
        expect(message).to.equal('wrong_argument_type');
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('lib fail', () => {
      const libResult = new Error('lib method fail');

      before(() => {
        stubLib = sandbox
          .stub(lib, 'default')
          .callsFake(() => Promise.reject(libResult));
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
    const libResult = {
      pushNotificationsResults: [],
      userMetricsResults: [],
    };

    before(() => {
      stubLib = sandbox.stub(lib, 'default').returns(libResult);
    });

    it('should return 200', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(200);
      expect(JSON.parse(response.body)).to.eql({
        pushNotificationsResults: [],
        userMetricsResults: [],
      });
    });

    it('should called with the good args', () => {
      const { id } = event.pathParameters;
      const { appId, principalId: userId } = event.requestContext.authorizer;

      sinon.assert.calledWith(stubLib, appId, userId, id);
    });

    after(() => {
      sandbox.restore();
    });
  });
});
