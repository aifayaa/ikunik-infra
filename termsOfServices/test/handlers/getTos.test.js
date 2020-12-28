import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';

import * as lib from '../../lib/getTos';
import handler from '../../handlers/getTos';
import * as getHtmlResults from '../../htmlResults';

describe('handlers - getTos', () => {
  let stubLib;
  let stubHtmlLib;

  const event = {
    requestContext: {
      authorizer: {
        appId: 'crowdaa_app_id',
      },
    },
    headers: {
      accept: 'accept',
    },
    pathParameters: {
      id: 'tosId',
    },
  };
  const sandbox = sinon.createSandbox();

  describe('Case lib return empty', () => {
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

    it('should call lib with params', () => {
      sinon.assert.calledWith(stubLib, 'crowdaa_app_id', 'tosId');
    });
    it('should return 404', () => {
      expect(response.statusCode).to.eql(404);
      expect(JSON.parse(response.body).message).to.eq('tos_not_found');
    });
    after(sandbox.restore);
  });

  describe('Test type of response', () => {
    describe('Get HTML response', () => {
      const libResult = '<h1>Results</h1>';
      let response;

      before(async () => {
        stubHtmlLib = sandbox.stub(getHtmlResults, 'getHtmlResults').returns(libResult);
        stubLib = sandbox.stub(lib, 'getTos').returns([{}]);
        event.headers.accept = 'text/html';
        response = await handler(event);
      });

      it('should call lib once', () => {
        expect(stubLib.calledOnce).to.be.true;
      });

      if (event.headers.accept.includes('text/html')) {
        it('should call stubHtmlLib', () => {
          expect(stubHtmlLib.called).to.be.true;
        });
      }
      it('should contain text/html in headers.accept', () => {
        expect(event.headers.accept).to.include('text/html');
      });

      it('should return html response', () => {
        expect(response.body).to.eql(libResult);
      });

      after(sandbox.restore);
    });

    describe('Get JSON response', () => {
      const libResult = [{ tos: [] }];
      let response;

      before(async () => {
        stubHtmlLib = sandbox.stub(getHtmlResults, 'getHtmlResults').returns('');
        stubLib = sandbox.stub(lib, 'getTos').returns(libResult);
        event.headers.accept = 'application/json';
        response = await handler(event);
      });

      if (event.headers.accept.includes('application/json')) {
        it('shouldn\'t call stubHtmlLib', () => {
          expect(stubHtmlLib.called).to.be.false;
        });
      }

      it('should contain application/json in headers.accept', () => {
        expect(event.headers.accept).to.include('application/json');
      });

      it('should return json response', () => {
        expect(JSON.parse(response.body)).to.eql(libResult);
      });

      after(sandbox.restore);
    });
  });

  describe('Case lib return results', () => {
    let response;
    before(async () => {
      stubLib = sandbox.stub(lib, 'getTos').returns([{
        _id: 'tosId',
        appId: 'crowdaa_app_id',
      }]);
      response = await handler(event);
    });
    it('should call lib once', () => {
      expect(stubLib.calledOnce).to.be.true;
    });

    it('should call lib with params', () => {
      sinon.assert.calledWith(stubLib, 'crowdaa_app_id', 'tosId');
    });
    it('should return 200', () => {
      expect(response.statusCode).to.eql(200);
    });
    after(sandbox.restore);
  });
  describe('Case libs trigger error', () => {
    describe('getTos', () => {
      let response;
      before(async () => {
        stubLib = sandbox.stub(lib, 'getTos').callsFake(() => Promise.reject(new Error('error_message')));
        stubHtmlLib = sandbox.stub(getHtmlResults, 'getHtmlResults').returns('');
        response = await handler(event);
      });
      it('should call lib once', () => {
        expect(stubLib.calledOnce).to.be.true;
      });

      it('shouldn\'t call stubHtmlLib', () => {
        expect(stubHtmlLib.called).to.be.false;
      });

      it('should call lib with params', () => {
        sinon.assert.calledWith(stubLib, 'crowdaa_app_id', 'tosId');
      });

      it('should return 500', () => {
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

      it('should call stubHtmlLib', () => {
        expect(stubHtmlLib.called).to.be.true;
      });

      it('should call lib with right params', () => {
        sinon.assert.calledWith(stubLib, 'crowdaa_app_id', 'tosId');
      });

      it('should return a response with HTTP code 500', () => {
        expect(response.statusCode).to.eql(500);
      });
      after(sandbox.restore);
    });
  });
});
