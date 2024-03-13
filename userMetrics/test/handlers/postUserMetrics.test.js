/* eslint-disable import/no-relative-packages */
import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import * as lib from '../../lib/postUserMetrics';
import handler from '../../handlers/postUserMetrics';

/** @TODO Re-enable tests. Skipped after permissions checking update */
describe.skip('handlers - postUserMetrics', () => {
  let stubLib;
  const MESSAGES = {
    MISSING_ARGUMENT: 'Missing arguments',
    WRONG_ARGUMENT_TYPE: 'Wrong argument type',
    WRONG_TYPE_VALUE: 'Wrong type value',
    END_TIME_LATER_THAN_START_TIME: 'End time must be later than start time',
  };
  const event = {
    body: JSON.stringify({
      type: 'time',
      contentId: '66494021-bcbf-4eea-bf04-a666c44bda57',
      contentCollection: 'article',
      data: {
        startTime: new Date(),
        endTime: new Date(),
      },
    }),
    requestContext: {
      authorizer: {
        perms: JSON.stringify({}),
        appId: 'crowdaa_app_id',
        principalId: 'userId',
      },
    },
  };
  const sandbox = sinon.createSandbox();

  describe('lib error', () => {
    describe('general arguments', () => {
      describe('missing', () => {
        before(() => {
          stubLib = sandbox.stub(lib, 'default').throws();
        });

        it('missing type', async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          const body = JSON.parse(testEvent.body);
          delete body.type;
          testEvent.body = JSON.stringify(body);
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(500);
          expect(message).to.equal(MESSAGES.MISSING_ARGUMENT);
        });

        it('missing contentId', async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          const body = JSON.parse(testEvent.body);
          delete body.contentId;
          testEvent.body = JSON.stringify(body);
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(500);
          expect(message).to.equal(MESSAGES.MISSING_ARGUMENT);
        });

        it('missing contentCollection', async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          const body = JSON.parse(testEvent.body);
          delete body.contentCollection;
          testEvent.body = JSON.stringify(body);
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(500);
          expect(message).to.equal(MESSAGES.MISSING_ARGUMENT);
        });

        after(() => {
          sandbox.restore();
        });
      });

      describe('wrong type', () => {
        before(() => {
          stubLib = sandbox.stub(lib, 'default').throws();
        });

        it('wrong type for appId', async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          testEvent.requestContext.authorizer.appId = 1;
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(500);
          expect(message).to.equal(MESSAGES.WRONG_ARGUMENT_TYPE);
        });

        it('wrong type for userId', async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          testEvent.requestContext.authorizer.principalId = 1;
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(500);
          expect(message).to.equal(MESSAGES.WRONG_ARGUMENT_TYPE);
        });

        it('wrong type for type', async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          const body = JSON.parse(testEvent.body);
          body.type = 1;
          testEvent.body = JSON.stringify(body);
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(500);
          expect(message).to.equal(MESSAGES.WRONG_ARGUMENT_TYPE);
        });

        it('wrong type for contentId', async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          const body = JSON.parse(testEvent.body);
          body.contentId = 1;
          testEvent.body = JSON.stringify(body);
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(500);
          expect(message).to.equal(MESSAGES.WRONG_ARGUMENT_TYPE);
        });

        it('wrong type for contentCollection', async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          const body = JSON.parse(testEvent.body);
          body.contentCollection = 1;
          testEvent.body = JSON.stringify(body);
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(500);
          expect(message).to.equal(MESSAGES.WRONG_ARGUMENT_TYPE);
        });

        after(() => {
          sandbox.restore();
        });
      });

      describe('wrong type value', () => {
        before(() => {
          stubLib = sandbox.stub(lib, 'default').throws();
        });

        it('value is not listed', async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          const body = JSON.parse(testEvent.body);
          body.type = 'VaLuEIsNoTlIStEd9_Q,2';
          testEvent.body = JSON.stringify(body);
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(500);
          expect(message).to.equal(MESSAGES.WRONG_TYPE_VALUE);
        });

        after(() => {
          sandbox.restore();
        });
      });
    });

    describe('time arguments', () => {
      describe('missing', () => {
        before(() => {
          stubLib = sandbox.stub(lib, 'default').throws();
        });

        it('missing startTime', async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          const body = JSON.parse(testEvent.body);
          delete body.data.startTime;
          testEvent.body = JSON.stringify(body);
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(500);
          expect(message).to.equal(MESSAGES.MISSING_ARGUMENT);
        });

        it('missing endTime', async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          const body = JSON.parse(testEvent.body);
          delete body.data.endTime;
          testEvent.body = JSON.stringify(body);
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(500);
          expect(message).to.equal(MESSAGES.MISSING_ARGUMENT);
        });

        after(() => {
          sandbox.restore();
        });
      });

      describe('wrong type', () => {
        before(() => {
          stubLib = sandbox.stub(lib, 'default').throws();
        });

        it('wrong type for startTime', async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          const body = JSON.parse(testEvent.body);
          body.data.startTime = 1;
          testEvent.body = JSON.stringify(body);
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(500);
          expect(message).to.equal(MESSAGES.WRONG_ARGUMENT_TYPE);
        });

        it('wrong type for startTime', async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          const body = JSON.parse(testEvent.body);
          body.data.endTime = 1;
          testEvent.body = JSON.stringify(body);
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(500);
          expect(message).to.equal(MESSAGES.WRONG_ARGUMENT_TYPE);
        });

        after(() => {
          sandbox.restore();
        });
      });

      describe('end time later than start time', () => {
        before(() => {
          stubLib = sandbox.stub(lib, 'default').throws();
        });

        it('end time is sooner than start time', async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          const body = JSON.parse(testEvent.body);
          body.data.startTime = new Date();
          body.data.endTime = new Date();
          body.data.endTime.setTime(body.data.startTime.getTime() - 1000);
          testEvent.body = JSON.stringify(body);
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(500);
          expect(message).to.equal(MESSAGES.END_TIME_LATER_THAN_START_TIME);
        });

        after(() => {
          sandbox.restore();
        });
      });
    });

    describe('any', () => {
      before(() => {
        stubLib = sandbox.stub(lib, 'default').throws();
      });

      it('should return 500', async () => {
        const response = await handler(event);
        expect(response.statusCode).to.equal(500);
      });

      after(() => {
        sandbox.restore();
      });
    });
  });

  describe('success', () => {
    let response;
    describe('call lib using type = time', () => {
      before(async () => {
        stubLib = sandbox.stub(lib, 'default').returns(true);
        response = await handler(event);
      });

      it('should return 200', () => {
        expect(response.statusCode).to.equal(200);
      });

      // TODO: FIX TEST
      it.skip('should call lib with right args', () => {
        const { principalId, appId } = event.requestContext.authorizer;
        const bodyParsed = JSON.parse(event.body);
        const { type, contentId, contentCollection, data } = bodyParsed;
        sinon.assert.calledWith(
          stubLib,
          appId,
          principalId,
          type,
          contentId,
          contentCollection,
          data
        );
      });

      after(() => {
        sandbox.restore();
      });
    });
  });
});
