import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import * as pathToCollection from '../../../libs/collections/pathToCollection';
import * as lib from '../../lib/postUserGeneratedContents';
import handler from '../../handlers/postUserGeneratedContents';

describe('handlers - postUserGeneratedContents', () => {
  let stubLib;
  let stubPathToCollection;
  const event = {
    body: JSON.stringify({
      parentId: '66494021-bcbf-4eea-bf04-a666c44bda57',
      type: 'article',
      data: {

      },
    }),
    requestContext: {
      authorizer: {
        perms: JSON.stringify({}),
        appId: 'crowdaa_app_id',
        principalId: 'userId',
      },
      resourcePath: '',
    },
  };
  const sandbox = sinon.createSandbox();

  describe('lib error', () => {
    describe('any', () => {
      before(() => {
        stubLib = sandbox.stub(lib, 'default').throws();
        stubPathToCollection = sandbox.stub(pathToCollection, 'default').returns(process.env.COLL_USER_GENERATED_CONTENTS);
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
      stubPathToCollection = sandbox.stub(pathToCollection, 'default').returns(process.env.COLL_USER_GENERATED_CONTENTS);
      response = await handler(event);
    });

    it('should return 200', () => {
      expect(response.statusCode).to.equal(200);
    });

    it('should call lib with right args', () => {
      const {
        principalId,
        appId,
      } = event.requestContext.authorizer;
      const bodyParsed = JSON.parse(event.body);
      const {
        parentId,
        type,
        data,
      } = bodyParsed;
      const parentCollection = process.env.COLL_USER_GENERATED_CONTENTS;
      const rootParentId = parentId;
      const rootParentCollection = parentCollection;

      sinon.assert.calledOnce(stubPathToCollection);
      sinon.assert.calledWith(
        stubLib,
        appId,
        parentId,
        parentCollection,
        rootParentId,
        rootParentCollection,
        principalId,
        type,
        data,
      );
    });

    after(() => {
      sandbox.restore();
    });
  });
});
