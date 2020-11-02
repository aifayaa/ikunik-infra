import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';

import * as lib from '../../../termsOfServices/lib/getTos';
import handler from '../../handlers/getAppTos';
import * as getHtmlResults from '../../../termsOfServices/htmlResults';

describe('handlers - getAppTos', () => {
  let stubLib;
  let stubHtmlLib;

  const event = {
    pathParameters: {
      id: 'appId',
    },
    headers: {
      accept: 'accept' || 'Accept',
    },
  };

  const sandbox = sinon.createSandbox();

  describe('tos_not_found', () => {
    let response;
    before(async () => {
      stubHtmlLib = sandbox.stub(getHtmlResults, 'getHtmlResults').returns('');
      stubLib = sandbox.stub(lib, 'getTos').returns([]);
      response = await handler(event);
    });

    it('should call lib once', () => {
      expect(stubLib.calledOnce).to.be.true;
    });

    it('shouldn\'t call getHtmlResults', () => {
      expect(stubHtmlLib.called).to.be.false;
    });

    it('should call lib with right params', () => {
      const appId = event.pathParameters.id;
      sinon.assert.calledWith(
        stubLib,
        appId,
        false,
        { outdated: false, required: true },
      );
    });

    it('should return 404', () => {
      expect(response.statusCode).to.equal(404);
      expect(JSON.parse(response.body).message).to.eq('tos_not_found');
    });

    after(sandbox.restore);
  });

  describe('Lib return results', () => {
    let response;

    before(async () => {
      stubLib = sandbox.stub(lib, 'getTos').returns([{
        _id: 'crowdaa_app_id',
      }]);
      response = await handler(event);
    });

    it('should call lib once', () => {
      expect(stubLib.calledOnce).to.be.true;
    });

    it('should call lib with right params', () => {
      const appId = event.pathParameters.id;
      sinon.assert.calledWith(
        stubLib,
        appId,
        false,
        { outdated: false, required: true },
      );
    });

    it('should return a response with HTTP code 200', () => {
      expect(response.statusCode).to.eql(200);
    });
    after(sandbox.restore);
  });

  describe('Libs trigger error', () => {
    describe('getTos', () => {
      let response;
      before(async () => {
        stubLib = sandbox.stub(lib, 'getTos').throws(new Error('An error'));
        stubHtmlLib = sandbox.stub(getHtmlResults, 'getHtmlResults').returns('');
        response = await handler(event);
      });

      it('should call lib once', () => {
        expect(stubLib.calledOnce).to.be.true;
      });

      it('shouldn\'t call stubHtmlLib', () => {
        expect(stubHtmlLib.called).to.be.false;
      });

      it('should call lib with right params', () => {
        const appId = event.pathParameters.id;
        sinon.assert.calledWith(
          stubLib,
          appId,
          false,
          { outdated: false, required: true },
        );
      });

      it('should return a response with HTTP code 500', () => {
        expect(response.statusCode).to.eql(500);
      });
      after(sandbox.restore);
    });

    describe('getHtmlResults', () => {
      let response;
      before(async () => {
        stubLib = sandbox.stub(lib, 'getTos').returns([{}]);
        stubHtmlLib = sandbox.stub(getHtmlResults, 'getHtmlResults').throws(new Error('An Error'));
        response = await handler(event);
      });

      it('should call lib once', () => {
        expect(stubLib.calledOnce).to.be.true;
      });

      it('shouldn\'t call stubHtmlLib', () => {
        expect(stubHtmlLib.called).to.be.true;
      });

      it('should call lib with right params', () => {
        const appId = event.pathParameters.id;
        sinon.assert.calledWith(
          stubLib,
          appId,
          false,
          { outdated: false, required: true },
        );
      });

      it('should return a response with HTTP code 500', () => {
        expect(response.statusCode).to.eql(500);
      });
      after(sandbox.restore);
    });
  });
});
