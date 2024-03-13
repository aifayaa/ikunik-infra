/* eslint-disable import/no-relative-packages */
import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import * as lib from '../../lib/deletePurchasableProduct';
import handler from '../../handlers/deletePurchasableProduct';

/** @TODO Re-enable tests. Skipped after permissions checking update */
describe.skip('handlers - deletePurchasableProduct', () => {
  let stubLib;
  const event = {
    requestContext: {
      authorizer: {
        appId: 'crowdaa_app_id',
        perms: JSON.stringify({ purchasableProducts_delete: true }),
        principalId: 'userId',
      },
    },
    pathParameters: {
      id: 'productId',
    },
  };
  const sandbox = sinon.createSandbox();

  describe('lib error', () => {
    describe('perms error', () => {
      before(() => {
        stubLib = sandbox.stub(lib, 'deletePurchasableProduct').throws();
      });

      it('access_forbidden', async () => {
        const testEvent = JSON.parse(JSON.stringify(event));
        testEvent.requestContext.authorizer.perms = JSON.stringify({});
        const response = await handler(testEvent);
        const { message } = JSON.parse(response.body);
        expect(response.statusCode).to.equal(403);
        expect(message).to.equal('access_forbidden');
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('lib fail', () => {
      const libResult = new Error('lib method fail');

      before(() => {
        stubLib = sandbox
          .stub(lib, 'deletePurchasableProduct')
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
    const libResult = 'ok';

    before(() => {
      stubLib = sandbox
        .stub(lib, 'deletePurchasableProduct')
        .returns(libResult);
    });

    it('should return 200', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(200);
      expect(JSON.parse(response.body)).to.eql({ message: 'ok' });
    });

    it('should called with the good args', () => {
      const { id: productId } = event.pathParameters;
      const { appId, principalId: userId } = event.requestContext.authorizer;
      sinon.assert.calledWith(stubLib, appId, userId, productId);
    });

    after(() => {
      sandbox.restore();
    });
  });
});
