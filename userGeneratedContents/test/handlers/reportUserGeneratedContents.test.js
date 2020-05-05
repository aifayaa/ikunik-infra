import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import * as lib from '../../lib/reportUserGeneratedContents';
import handler from '../../handlers/reportUserGeneratedContents';

describe('handlers - reportUserGeneratedContents', () => {
  let stubLib;
  const event = {
    body: JSON.stringify({
      details: 'details',
      reason: 'inappropriate',
    }),
    requestContext: {
      authorizer: {
        perms: JSON.stringify({}),
        appId: 'crowdaa_app_id',
        principalId: 'userId',
      },
    },
    pathParameters: {
      id: 'userGeneratedContentsId',
    },
  };
  const sandbox = sinon.createSandbox();

  describe('lib error', () => {
    describe('missing_payload', () => {
      before(() => {
        stubLib = sandbox.stub(lib, 'default').returns(true);
      });

      it('should return 400', async () => {
        const finalEvent = { ...event };
        finalEvent.body = null;
        const response = await handler(finalEvent);
        expect(response.statusCode).to.equal(400);
        expect(JSON.parse(response.body).message).to.eq('missing_payload');
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('missing_arguments', () => {
      before(() => {
        stubLib = sandbox.stub(lib, 'default').returns(true);
      });

      it('should return 400', async () => {
        const finalEvent = { ...event };
        finalEvent.body = JSON.stringify({});
        const response = await handler(finalEvent);
        expect(response.statusCode).to.equal(400);
        expect(JSON.parse(response.body).message).to.eq('missing_arguments');
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('wrong_argument_type reason', () => {
      before(() => {
        stubLib = sandbox.stub(lib, 'default').returns(true);
      });

      it('should return 400', async () => {
        const finalEvent = { ...event };
        finalEvent.body = JSON.stringify({ reason: 1, details: 'details' });
        const response = await handler(finalEvent);
        expect(response.statusCode).to.equal(400);
        expect(JSON.parse(response.body).message).to.eq('wrong_argument_type');
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('wrong_argument_type details', () => {
      before(() => {
        stubLib = sandbox.stub(lib, 'default').returns(true);
      });

      it('should return 400', async () => {
        const finalEvent = { ...event };
        finalEvent.body = JSON.stringify({ reason: 'inappropriate', details: 1 });
        const response = await handler(finalEvent);
        expect(response.statusCode).to.equal(400);
        expect(JSON.parse(response.body).message).to.eq('wrong_argument_type');
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('unavailable_reason', () => {
      before(() => {
        stubLib = sandbox.stub(lib, 'default').returns(true);
      });

      it('should return 400', async () => {
        const finalEvent = { ...event };
        finalEvent.body = JSON.stringify({ reason: 'reason', details: 'details' });
        const response = await handler(finalEvent);
        expect(response.statusCode).to.equal(400);
        expect(JSON.parse(response.body).message).to.eq('unavailable_reason');
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('ugc_not_found', () => {
      before(() => {
        stubLib = sandbox.stub(lib, 'default').throws(new Error('ugc_not_found'));
      });

      it('should return 404', async () => {
        const response = await handler(event);
        expect(response.statusCode).to.equal(404);
        expect(JSON.parse(response.body).message).to.eq('ugc_not_found');
      });

      after(() => {
        sandbox.restore();
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

    before(async () => {
      stubLib = sandbox.stub(lib, 'default').returns(true);
      response = await handler(event);
    });

    it('should return 200', () => {
      expect(response.statusCode).to.equal(200);
    });

    it('should call lib with right args', () => {
      const { id } = event.pathParameters;
      const {
        principalId,
        appId,
      } = event.requestContext.authorizer;
      const bodyParsed = JSON.parse(event.body);
      const {
        details,
        reason,
      } = bodyParsed;

      sinon.assert.calledWith(
        stubLib,
        appId,
        principalId,
        id,
        reason,
        details,
      );
    });

    after(() => {
      sandbox.restore();
    });
  });
});
