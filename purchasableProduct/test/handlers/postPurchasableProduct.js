import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import * as lib from '../../lib/postPurchasableProduct';
import handler from '../../handlers/postPurchasableProduct';

describe('handlers - postPurchasableProduct', () => {
  let stubLib;
  const event = {
    requestContext: {
      authorizer: {
        appId: 'crowdaa_app_id',
        perms: JSON.stringify({ purchasableProducts_post: true }),
        principalId: 'userId',
      },
    },
    body: JSON.stringify({
      _id: '_id',
      contents: [],
      options: { expiresIn: '2020/01/01' },
      perms: {
        all: false,
        read: false,
        write: false,
      },
      price: '6',
      type: 'direct',
    }),
  };

  const sandbox = sinon.createSandbox();

  describe('lib error', () => {
    describe('perms error', () => {
      before(() => {
        stubLib = sandbox.stub(lib, 'postPurchasableProduct').throws();
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

    describe('missing_payload', () => {
      before(() => {
        stubLib = sandbox.stub(lib, 'postPurchasableProduct').throws();
      });

      it('body is missing', async () => {
        const testEvent = JSON.parse(JSON.stringify(event));
        delete testEvent.body;
        const response = await handler(testEvent);
        const { message } = JSON.parse(response.body);
        expect(response.statusCode).to.equal(400);
        expect(message).to.equal('missing_payload');
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('missing_argument', () => {
      before(() => {
        stubLib = sandbox.stub(lib, 'postPurchasableProduct').throws();
      });

      ['contents', 'perms', 'price', 'type'].forEach((key) => {
        it(`missing ${key}`, async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          const body = JSON.parse(testEvent.body);
          delete body[key];
          testEvent.body = JSON.stringify(body);
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(400);
          expect(message).to.equal('missing_argument');
        });
      });

      ['all', 'read', 'write'].forEach((key) => {
        it(`missing perms.${key}`, async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          const body = JSON.parse(testEvent.body);
          delete body.perms[key];
          testEvent.body = JSON.stringify(body);
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(400);
          expect(message).to.equal('missing_argument');
        });
      });

      it('missing contents.id', async () => {
        const testEvent = JSON.parse(JSON.stringify(event));
        const body = JSON.parse(testEvent.body);
        body.contents.push({ collection: 'pressArticles' });
        testEvent.body = JSON.stringify(body);
        const response = await handler(testEvent);
        const { message } = JSON.parse(response.body);
        expect(response.statusCode).to.equal(400);
        expect(message).to.equal('missing_argument');
      });

      it('missing contents.collection', async () => {
        const testEvent = JSON.parse(JSON.stringify(event));
        const body = JSON.parse(testEvent.body);
        body.contents.push({ id: 'id' });
        testEvent.body = JSON.stringify(body);
        const response = await handler(testEvent);
        const { message } = JSON.parse(response.body);
        expect(response.statusCode).to.equal(400);
        expect(message).to.equal('missing_argument');
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('wrong_argument_type', () => {
      before(() => {
        stubLib = sandbox.stub(lib, 'postPurchasableProduct').throws();
      });

      ['_id', 'price', 'type', 'contents'].forEach((key) => {
        it(`wrong type for ${key}`, async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          const body = JSON.parse(testEvent.body);
          body[key] = {};
          testEvent.body = JSON.stringify(body);
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(400);
          expect(message).to.equal('wrong_argument_type');
        });
      });

      ['all', 'read', 'write'].forEach((key) => {
        it(`wrong type for perms.${key}`, async () => {
          const testEvent = JSON.parse(JSON.stringify(event));
          const body = JSON.parse(testEvent.body);
          body.perms[key] = [];
          testEvent.body = JSON.stringify(body);
          const response = await handler(testEvent);
          const { message } = JSON.parse(response.body);
          expect(response.statusCode).to.equal(400);
          expect(message).to.equal('wrong_argument_type');
        });
      });

      it('wrong type for contents.id', async () => {
        const testEvent = JSON.parse(JSON.stringify(event));
        const body = JSON.parse(testEvent.body);
        body.contents.push({ id: 4, collection: 'pressArticles' });
        testEvent.body = JSON.stringify(body);
        const response = await handler(testEvent);
        const { message } = JSON.parse(response.body);
        expect(response.statusCode).to.equal(400);
        expect(message).to.equal('wrong_argument_type');
      });

      it('wrong type for contents.collection', async () => {
        const testEvent = JSON.parse(JSON.stringify(event));
        const body = JSON.parse(testEvent.body);
        body.contents.push({ id: 'id', collection: 4 });
        testEvent.body = JSON.stringify(body);
        const response = await handler(testEvent);
        const { message } = JSON.parse(response.body);
        expect(response.statusCode).to.equal(400);
        expect(message).to.equal('wrong_argument_type');
      });

      it('wrong type for options.expiresIn', async () => {
        const testEvent = JSON.parse(JSON.stringify(event));
        const body = JSON.parse(testEvent.body);
        body.options.expiresIn = 1;
        testEvent.body = JSON.stringify(body);
        const response = await handler(testEvent);
        const { message } = JSON.parse(response.body);
        expect(response.statusCode).to.equal(400);
        expect(message).to.equal('wrong_argument_type');
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('wrong_argument_value', () => {
      before(() => {
        stubLib = sandbox.stub(lib, 'postPurchasableProduct').throws();
      });

      it('wrong value for type', async () => {
        const testEvent = JSON.parse(JSON.stringify(event));
        const body = JSON.parse(testEvent.body);
        body.type = 'type';
        testEvent.body = JSON.stringify(body);
        const response = await handler(testEvent);
        const { message } = JSON.parse(response.body);
        expect(response.statusCode).to.equal(400);
        expect(message).to.equal('wrong_argument_value');
      });

      it('wrong value for options.expiresIn / boolean', async () => {
        const testEvent = JSON.parse(JSON.stringify(event));
        const body = JSON.parse(testEvent.body);
        body.options.expiresIn = true;
        testEvent.body = JSON.stringify(body);
        const response = await handler(testEvent);
        const { message } = JSON.parse(response.body);
        expect(response.statusCode).to.equal(400);
        expect(message).to.equal('wrong_argument_value');
      });

      it('wrong value for options.expiresIn / string', async () => {
        const testEvent = JSON.parse(JSON.stringify(event));
        const body = JSON.parse(testEvent.body);
        body.options.expiresIn = 'lala';
        testEvent.body = JSON.stringify(body);
        const response = await handler(testEvent);
        const { message } = JSON.parse(response.body);
        expect(response.statusCode).to.equal(400);
        expect(message).to.equal('wrong_argument_value');
      });

      after(() => {
        sandbox.restore();
      });
    });

    describe('lib fail', () => {
      const libResult = new Error('lib method fail');

      before(() => {
        stubLib = sandbox.stub(lib, 'postPurchasableProduct').callsFake(() => Promise.reject(libResult));
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
      stubLib = sandbox.stub(lib, 'postPurchasableProduct').returns(libResult);
    });

    it('should return 200', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(200);
      expect(JSON.parse(response.body)).to.eql({ message: 'ok' });
    });

    it('should called with the good args', () => {
      const {
        principalId: userId,
        appId,
      } = event.requestContext.authorizer;
      const bodyParsed = JSON.parse(event.body);
      bodyParsed.options.expiresIn = new Date(bodyParsed.options.expiresIn);
      sinon.assert.calledWith(
        stubLib,
        appId,
        userId,
        bodyParsed,
      );
    });

    after(() => {
      sandbox.restore();
    });
  });
});
