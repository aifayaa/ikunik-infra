import sinon from 'sinon';
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';

import * as getHtmlResults from '../../../termsOfServices/htmlResults';
import * as lib from '../../../termsOfServices/lib/getTos';
import handler from '../../handlers/getAppTos';

describe('handlers - getAppTos', () => {
  let stubLib;
  let stubHtmlLib;

  const event = {
    pathParameters: {
      id: 'appId',
    },
  };

  const sandbox = sinon.createSandbox();

  describe('Lib return empty', () => {
    let response;
    before(async () => {
      // Create a sandbox to remove track of every fake created
      // Wrapping the existing function in a stub function & return empty array
      stubLib = sandbox.stub(lib, 'getTos').returns([{}]);
      // stubHtmlLib = sandbox.stub(getHtmlResults, 'getHtmlResults').returns([{}]);
      response = await handler(event);
    });
    // Passes if stubLib spy was called only once
    it('should call lib once', () => {
      expect(stubLib.calledOnce).to.be.true;
      // expect(stubHtmlLib.calledOnce).to.be.true;
    });
    // Passes if stubLib spy was called with the right params
    it('should call lib with right params', () => {
      const appId = event.pathParameters.id;
      sinon.assert.calledWith(
        stubLib,
        appId,
        false,
        { outdated: false, required: true },
      );
    });
    // expect returning error 404
    it('should return a response with HTTP code 404', () => {
      expect(response.statusCode).to.eql(404);
    });
    // Clean the sandbox
    after(sandbox.restore);
  });

  describe('Lib return results', () => {
    let response;

    before(async () => {
      // Create a sandbox to remove track of every fake created
      // Wrapping the existing function in a stub function & return parameters
      stubLib = sandbox.stub(lib, 'getTos').returns([{
        _id: 'crowdaa_app_id',
      }]);
      // stubHtmlLib = sandbox.stub(getHtmlResultsLib, 'getHtmlResults').returns();
      // console.log(stubHtmlLib);
      response = await handler(event);
    });
    it('should call lib once', () => {
      // Passes if stubLib spy was called only once
      expect(stubLib.calledOnce).to.be.true;
      // expect(stubHtmlLib.calledOnce).to.be.true;
    });

    it('should call lib with right params', () => {
      const appId = event.pathParameters.id;
      // Passes if stubLib spy was called with the right params
      sinon.assert.calledWith(
        stubLib,
        appId,
        false,
        { outdated: false, required: true },
      );
    });
    // expect returning error 200
    it('should return a response with HTTP code 200', () => {
      expect(response.statusCode).to.eql(200);
    });
    // Clean the sandbox
    after(sandbox.restore);
  });
  describe('Lib trigger error', () => {
    let response;
    before(async () => {
      // Create a promise reject message to fake error response
      stubLib = sandbox.stub(lib, 'getTos').callsFake(() => Promise.reject(new Error('error_message')));
      stubHtmlLib = sandbox.stub(getHtmlResults, 'getHtmlResults').callsFake(() => Promise.reject(new Error('error_message')));
      response = await handler(event);
    });
    // Passes if stubLib spy was called only once
    it('should call lib once', () => {
      expect(stubLib.calledOnce).to.be.true;
      // expect(stubHtmlLib.calledOnce).to.be.true;
      sinon.assert.calledOnce(stubHtmlLib);
    });
    // Passes if stubLib spy was called with the right params
    it('should call lib with right params', () => {
      const appId = event.pathParameters.id;
      sinon.assert.calledWith(
        stubLib,
        appId,
        false,
        { outdated: false, required: true },
      );
    });
    // expect returning error 500
    it('should return a response with HTTP code 500', () => {
      expect(response.statusCode).to.eql(500);
    });
    after(sandbox.restore);
  });
});
