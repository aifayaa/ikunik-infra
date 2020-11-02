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
      //return 500 instead of 404
      stubHtmlLib = sandbox.stub(getHtmlResults, 'getHtmlResults').throws(new Error('tos_not_found'));
      console.log(stubHtmlLib);
      stubLib = sandbox.stub(lib, 'getTos').returns([]);
      response = await handler(event);
      console.log(response);
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

    it('should return 404', () => {
      expect(response.statusCode).to.equal(404);
      expect(JSON.parse(response.body).message).to.eq('tos_not_found');
    });

    after(sandbox.restore);
  });

  // /////////////////// TEST OK ////////////////////////
  // describe('Lib return results', () => {
  //   let response;

  //   before(async () => {
  //     stubLib = sandbox.stub(lib, 'getTos').returns([{
  //       _id: 'crowdaa_app_id',
  //     }]);
  //     response = await handler(event);
  //   });

  //   it('should call lib once', () => {
  //     expect(stubLib.calledOnce).to.be.true;
  //   });

  //   it('should call lib with right params', () => {
  //     const appId = event.pathParameters.id;
  //     sinon.assert.calledWith(
  //       stubLib,
  //       appId,
  //       false,
  //       { outdated: false, required: true },
  //     );
  //   });

  //   it('should return a response with HTTP code 200', () => {
  //     expect(response.statusCode).to.eql(200);
  //   });
  //   after(sandbox.restore);
  // });
  // /////////////////// TEST OK ////////////////////////

  describe('Lib trigger error', () => {
    let response;
    before(async () => {
      stubLib = sandbox.stub(lib, 'getTos').callsFake(() => Promise.reject(new Error('error_message')));
      stubHtmlLib = sandbox.stub(getHtmlResults, 'getHtmlResults').throws(new Error('tos_not_found'));
      response = await handler(event);
      console.log(response);
    });

    it('should call lib once', () => {
      // AssertError: expected getHtmlResults to be called once but was called 0 times
      sinon.assert.calledOnce(stubHtmlLib);
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

    it('should return a response with HTTP code 500', () => {
      expect(response.statusCode).to.eql(500);
      // console.log(response.statusCode);
    });
    after(sandbox.restore);
  });
});
