module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./handler.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "../libs/httpResponses/CrowdaaError.js":
/*!*********************************************!*\
  !*** ../libs/httpResponses/CrowdaaError.js ***!
  \*********************************************/
/*! exports provided: CrowdaaError */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CrowdaaError", function() { return CrowdaaError; });
class CrowdaaError extends Error {
  constructor(type, code, message, { httpCode = null, details = null } = {}) {
    super(message);
    this.name = 'CrowdaaError';
    this.type = type;
    this.code = code;
    this.httpCode = httpCode || 200;
    this.details = details;
  }
}


/***/ }),

/***/ "../libs/httpResponses/CrowdaaErrorWithErrorBody.js":
/*!**********************************************************!*\
  !*** ../libs/httpResponses/CrowdaaErrorWithErrorBody.js ***!
  \**********************************************************/
/*! exports provided: CrowdaaErrorWithErrorBody */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CrowdaaErrorWithErrorBody", function() { return CrowdaaErrorWithErrorBody; });
class CrowdaaErrorWithErrorBody extends Error {
  constructor(errorBody, { httpCode = null } = {}) {
    super('Several error messages');
    this.name = 'CrowdaaErrorWithErrorBody';
    this.errorBody = errorBody;
    this.httpCode = httpCode || 200;
  }
}


/***/ }),

/***/ "../libs/httpResponses/errorCodes.js":
/*!*******************************************!*\
  !*** ../libs/httpResponses/errorCodes.js ***!
  \*******************************************/
/*! exports provided: ERROR_TYPE_AUTHORIZATION, ERROR_TYPE_CONFLICT, ERROR_TYPE_NOT_ALLOWED, CANNOT_CHANGE_IOS_NAME_CODE, CANNOT_CHANGE_ANDROID_NAME_CODE, ORGANISATION_STILL_CONTAINS_APPLICATION_CODE, ORGANISATION_APPLE_TEAM_ALREADY_SETUP_CODE, NOT_ENOUGH_PERMISSIONS_CODE, AT_LEAST_ONE_OWNER_CODE, AT_LEAST_ONE_ADMIN_CODE, USER_ALREADY_EXISTS_CODE, APPLICATION_OUTSIDE_ORGANIZATION_CODE, ERROR_TYPE_NOT_FOUND, APP_NOT_FOUND_CODE, ORGANIZATION_NOT_FOUND_CODE, USER_NOT_FOUND_CODE, ERROR_TYPE_VALIDATION_ERROR, MISSING_BODY_CODE, MISSING_ORGANIZATION_CODE, ERROR_TYPE_ACCESS, ORGANIZATION_PERMISSION_CODE, APPLICATION_PERMISSION_CODE, ERROR_TYPE_INTERNAL_EXCEPTION, APP_ALREADY_BUILD_CODE, UNMANAGED_EXCEPTION_CODE, ERROR_TYPE_FORBIDDEN, DELETE_OWNER_CODE */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ERROR_TYPE_AUTHORIZATION", function() { return ERROR_TYPE_AUTHORIZATION; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ERROR_TYPE_CONFLICT", function() { return ERROR_TYPE_CONFLICT; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ERROR_TYPE_NOT_ALLOWED", function() { return ERROR_TYPE_NOT_ALLOWED; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CANNOT_CHANGE_IOS_NAME_CODE", function() { return CANNOT_CHANGE_IOS_NAME_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CANNOT_CHANGE_ANDROID_NAME_CODE", function() { return CANNOT_CHANGE_ANDROID_NAME_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ORGANISATION_STILL_CONTAINS_APPLICATION_CODE", function() { return ORGANISATION_STILL_CONTAINS_APPLICATION_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ORGANISATION_APPLE_TEAM_ALREADY_SETUP_CODE", function() { return ORGANISATION_APPLE_TEAM_ALREADY_SETUP_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "NOT_ENOUGH_PERMISSIONS_CODE", function() { return NOT_ENOUGH_PERMISSIONS_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AT_LEAST_ONE_OWNER_CODE", function() { return AT_LEAST_ONE_OWNER_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AT_LEAST_ONE_ADMIN_CODE", function() { return AT_LEAST_ONE_ADMIN_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "USER_ALREADY_EXISTS_CODE", function() { return USER_ALREADY_EXISTS_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "APPLICATION_OUTSIDE_ORGANIZATION_CODE", function() { return APPLICATION_OUTSIDE_ORGANIZATION_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ERROR_TYPE_NOT_FOUND", function() { return ERROR_TYPE_NOT_FOUND; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "APP_NOT_FOUND_CODE", function() { return APP_NOT_FOUND_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ORGANIZATION_NOT_FOUND_CODE", function() { return ORGANIZATION_NOT_FOUND_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "USER_NOT_FOUND_CODE", function() { return USER_NOT_FOUND_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ERROR_TYPE_VALIDATION_ERROR", function() { return ERROR_TYPE_VALIDATION_ERROR; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MISSING_BODY_CODE", function() { return MISSING_BODY_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "MISSING_ORGANIZATION_CODE", function() { return MISSING_ORGANIZATION_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ERROR_TYPE_ACCESS", function() { return ERROR_TYPE_ACCESS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ORGANIZATION_PERMISSION_CODE", function() { return ORGANIZATION_PERMISSION_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "APPLICATION_PERMISSION_CODE", function() { return APPLICATION_PERMISSION_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ERROR_TYPE_INTERNAL_EXCEPTION", function() { return ERROR_TYPE_INTERNAL_EXCEPTION; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "APP_ALREADY_BUILD_CODE", function() { return APP_ALREADY_BUILD_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "UNMANAGED_EXCEPTION_CODE", function() { return UNMANAGED_EXCEPTION_CODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ERROR_TYPE_FORBIDDEN", function() { return ERROR_TYPE_FORBIDDEN; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DELETE_OWNER_CODE", function() { return DELETE_OWNER_CODE; });
const ERROR_TYPE_AUTHORIZATION = 'Authorization';
const ERROR_TYPE_CONFLICT = 'Conflict';

const ERROR_TYPE_NOT_ALLOWED = 'NotAllowed';
const CANNOT_CHANGE_IOS_NAME_CODE = 'CANNOT_CHANGE_IOS_NAME';
const CANNOT_CHANGE_ANDROID_NAME_CODE = 'CANNOT_CHANGE_ANDROID_NAME';
const ORGANISATION_STILL_CONTAINS_APPLICATION_CODE =
  'ORGANISATION_STILL_CONTAINS_APPLICATION';
const ORGANISATION_APPLE_TEAM_ALREADY_SETUP_CODE =
  'ORGANISATION_APPLE_TEAM_ALREADY_SETUP';
const NOT_ENOUGH_PERMISSIONS_CODE = 'NOT_ENOUGH_PERMISSIONS';
const AT_LEAST_ONE_OWNER_CODE = 'AT_LEAST_ONE_OWNER';
const AT_LEAST_ONE_ADMIN_CODE = 'AT_LEAST_ONE_ADMIN';
const USER_ALREADY_EXISTS_CODE = 'USER_ALREADY_EXISTS';
const APPLICATION_OUTSIDE_ORGANIZATION_CODE =
  'APPLICATION_OUTSIDE_ORGANIZATION';

const ERROR_TYPE_NOT_FOUND = 'NotFound';
const APP_NOT_FOUND_CODE = 'APP_NOT_FOUND';
const ORGANIZATION_NOT_FOUND_CODE = 'ORGANIZATION_NOT_FOUND';
const USER_NOT_FOUND_CODE = 'USER_NOT_FOUND';

const ERROR_TYPE_VALIDATION_ERROR = 'ValidationError';
const MISSING_BODY_CODE = 'MISSING_BODY';
const MISSING_ORGANIZATION_CODE = 'MISSING_ORGANIZATION';

const ERROR_TYPE_ACCESS = 'CannotAccess';
const ORGANIZATION_PERMISSION_CODE = 'ORGANIZATION_PERMISSION';
const APPLICATION_PERMISSION_CODE = 'APPLICATION_PERMISSION';

const ERROR_TYPE_INTERNAL_EXCEPTION = 'InternalException';
const APP_ALREADY_BUILD_CODE = 'APP_ALREADY_BUILD';
const UNMANAGED_EXCEPTION_CODE = 'UNMANAGED_EXCEPTION';

const ERROR_TYPE_FORBIDDEN = 'Forbidden';
const DELETE_OWNER_CODE = 'DELETE_OWNER_CODE';


/***/ }),

/***/ "../libs/httpResponses/formatResponseBody.js":
/*!***************************************************!*\
  !*** ../libs/httpResponses/formatResponseBody.js ***!
  \***************************************************/
/*! exports provided: formatResponseBody */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "formatResponseBody", function() { return formatResponseBody; });
/**
 * @param {Object} params
 * @param {Object} params.data - the data to return when no errors occurred
 * @param {{type: string, code: string, path: string[], message: string, details: any}[]} params.errors - an array of errors
 * @param {string} params.errors[].type - ex: 'NotFound', 'InternalException', 'ValidationError' etc...
 * @param {string} params.errors[].code - ex: 'USER_NOT_FOUND' - can be used for i18n etc...
 * @param {string[]} params.errors[].path - the path to the validated field, ex: ['name']
 * @param {string} params.errors[].message - ex: 'User xxx not found.'
 * @param {unknown} params.errors[].details - contains additional detail about the error
 */
const formatResponseBody = ({ data, errors }) => {
  let message;

  if (errors) {
    message = {
      status: 'error',
      errors: errors.map((error) => ({
        ...error,
        timestamp: new Date().toISOString(),
      })),
    };
  } else if (data) {
    message = {
      status: 'success',
      data,
    };
  }

  return message;
};


/***/ }),

/***/ "../libs/httpResponses/response.js":
/*!*****************************************!*\
  !*** ../libs/httpResponses/response.js ***!
  \*****************************************/
/*! exports provided: default, handleException */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return response; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "handleException", function() { return handleException; });
/* harmony import */ var _CrowdaaError__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./CrowdaaError */ "../libs/httpResponses/CrowdaaError.js");
/* harmony import */ var _CrowdaaErrorWithErrorBody__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./CrowdaaErrorWithErrorBody */ "../libs/httpResponses/CrowdaaErrorWithErrorBody.js");
/* harmony import */ var _errorCodes__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./errorCodes */ "../libs/httpResponses/errorCodes.js");
/* harmony import */ var _formatResponseBody__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./formatResponseBody */ "../libs/httpResponses/formatResponseBody.js");





/* eslint-disable import/no-relative-packages */
function response({ headers = {}, code, body, message, raw }) {
  if (!body && !message) {
    message = 'http_error_missing_response_arguments';
  }
  let respBody;

  if (body) {
    if (raw) {
      respBody = body;
    } else {
      respBody = typeof body === 'string' ? { message: body } : body;
      respBody = JSON.stringify(respBody);
    }
  } else {
    respBody = JSON.stringify({ message });
  }

  return {
    statusCode: code || 500,
    body: respBody,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      ...headers,
    },
  };
}

function handleException(exception) {
  if (exception instanceof _CrowdaaError__WEBPACK_IMPORTED_MODULE_0__["CrowdaaError"]) {
    const { type, code, message } = exception;
    const errorBody = Object(_formatResponseBody__WEBPACK_IMPORTED_MODULE_3__["formatResponseBody"])({
      errors: [
        {
          type,
          code,
          message,
          details: exception.details || exception.stack,
        },
      ],
    });
    return response({ code: 200, body: errorBody });
  }

  if (exception instanceof _CrowdaaErrorWithErrorBody__WEBPACK_IMPORTED_MODULE_1__["CrowdaaErrorWithErrorBody"]) {
    const { errorBody } = exception;
    return response({ code: 200, body: errorBody });
  }

  const errorBody = Object(_formatResponseBody__WEBPACK_IMPORTED_MODULE_3__["formatResponseBody"])({
    errors: [
      {
        type: _errorCodes__WEBPACK_IMPORTED_MODULE_2__["ERROR_TYPE_INTERNAL_EXCEPTION"],
        code: _errorCodes__WEBPACK_IMPORTED_MODULE_2__["UNMANAGED_EXCEPTION_CODE"],
        message: exception.message,
        details: exception.stack,
      },
    ],
  });
  return response({ code: 200, body: errorBody });
}


/***/ }),

/***/ "./handler.js":
/*!********************!*\
  !*** ./handler.js ***!
  \********************/
/*! exports provided: handleGetPress, handleAdminGetPress */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "handleGetPress", function() { return handleGetPress; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "handleAdminGetPress", function() { return handleAdminGetPress; });
/* harmony import */ var _libs_httpResponses_response__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../libs/httpResponses/response */ "../libs/httpResponses/response.js");
/* eslint-disable import/no-relative-packages */


const handleGetPress = () =>
  new Promise((resolve) => {
    resolve(Object(_libs_httpResponses_response__WEBPACK_IMPORTED_MODULE_0__["default"])({ code: 200, body: 'API PRESS OK' }));
  });
const handleAdminGetPress = () =>
  new Promise((resolve) => {
    resolve(Object(_libs_httpResponses_response__WEBPACK_IMPORTED_MODULE_0__["default"])({ code: 200, body: 'API ADMIN PRESS OK' }));
  });


/***/ })

/******/ });
//# sourceMappingURL=handler.js.map