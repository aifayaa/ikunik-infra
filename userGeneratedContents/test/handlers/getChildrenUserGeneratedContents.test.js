/* eslint-disable import/no-relative-packages */
import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import * as pathToCollection from '../../../libs/collections/pathToCollection';
import mongoCollections from '../../../libs/mongoCollections.json';
import * as lib from '../../lib/getChildrenUserGeneratedContents';
import handler from '../../handlers/getChildrenUserGeneratedContents';

/** @TODO Re-enable tests. Skipped after permissions checking update */
describe.skip('handlers - getChildrenUserGeneratedContents', () => {
  let stubLib;
  let stubPathToCollection;

  const defaultStringParameters = {
    start: false,
    limit: false,
  };

  const event = {
    requestContext: {
      authorizer: {
        perms: JSON.stringify({}),
        appId: 'crowdaa_app_id',
      },
      resourcePath: '',
    },
    pathParameters: {
      id: 'parentId',
    },
    queryStringParameters: defaultStringParameters,
  };
  const sandbox = sinon.createSandbox();

  describe('lib success', () => {
    const libResult = 'ok';

    before(() => {
      stubLib = sandbox.stub(lib, 'default').returns(libResult);
      stubPathToCollection = sandbox
        .stub(pathToCollection, 'default')
        .returns(mongoCollections.COLL_USER_GENERATED_CONTENTS);
    });

    it('should return 200', async () => {
      const response = await handler(event);
      expect(response.statusCode).to.eq(200);
      expect(JSON.parse(response.body)).to.eql({ message: 'ok' });
    });

    it('should called with the good args', () => {
      const { id } = event.pathParameters;
      const { appId } = event.requestContext.authorizer;
      const { start, limit } = event.queryStringParameters;
      sinon.assert.calledOnce(stubPathToCollection);
      sinon.assert.calledWith(
        stubLib,
        appId,
        id,
        mongoCollections.COLL_USER_GENERATED_CONTENTS,
        start,
        limit
      );
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
      stubPathToCollection = sandbox
        .stub(pathToCollection, 'default')
        .returns(mongoCollections.COLL_USER_GENERATED_CONTENTS);
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
