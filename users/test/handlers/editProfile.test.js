/* eslint-disable import/no-relative-packages */
import sinon from 'sinon';
import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import * as lib from '../../lib/editProfile';
import handler from '../../handlers/editProfile';

/** @TODO Re-enable tests. Skipped after permissions checking update */
describe.skip('handlers - editProfile', () => {
  let stubLib;
  const event = {
    requestContext: {
      authorizer: {
        perms: JSON.stringify({}),
        appId: 'crowdaa_app_id',
        principalId: 'userId',
      },
    },
    pathParameters: {
      id: 'userId',
    },
    body: JSON.stringify({
      username: 'username',
    }),
  };
  const sandbox = sinon.createSandbox();

  describe('lib success', () => {
    const result = true;

    before(() => {
      stubLib = sandbox.stub(lib, 'default').returns(result);
    });

    it('should return 200', async () => {
      const response = await handler(event);
      const bodyDecoded = JSON.parse(response.body);
      expect(response.statusCode).to.eq(200);
      expect(bodyDecoded).to.deep.eq({ updated: result });
    });

    it('should called with the good args', () => {
      const eventParsed = JSON.parse(event.body);
      const { principalId, appId } = event.requestContext.authorizer;
      sinon.assert.calledWith(stubLib, principalId, appId, eventParsed);
    });

    after(() => {
      sandbox.restore();
    });
  });

  describe('no perms', () => {
    before(() => {
      stubLib = sandbox.stub(lib, 'default').returns({});
      event.pathParameters.id += 'a';
    });

    it('should return 403', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(403);
      expect(JSON.parse(response.body).message).to.eq('forbidden');
    });

    after(() => {
      event.pathParameters.id = event.pathParameters.id.slice(0, -1);
      sandbox.restore();
    });
  });

  describe('lib fail', () => {
    const result = new Error('lib method fail');

    beforeEach(() => {
      stubLib = sandbox
        .stub(lib, 'default')
        .callsFake(() => Promise.reject(result));
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return 500', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(500);
    });

    it('event.body not defined', async () => {
      event.body = undefined;
      const response = await handler(event);
      expect(response.statusCode).to.eq(500);
    });

    it('event.body.username not defined', async () => {
      event.body = JSON.stringify({
        username: undefined,
      });
      const response = await handler(event);
      expect(response.statusCode).to.eq(500);
    });

    it('event.body.username not a string', async () => {
      event.body = JSON.stringify({
        username: 2,
      });
      const response = await handler(event);
      expect(response.statusCode).to.eq(400);
    });

    it('event.body.username is too short', async () => {
      event.body = JSON.stringify({
        username: 'a',
      });
      const response = await handler(event);
      expect(response.statusCode).to.eq(500);
    });
  });
});
