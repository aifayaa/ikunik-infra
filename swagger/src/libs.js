const libs = {};

const defaultRespHeaders = {
  'Access-Control-Allow-Origin': {
    type: 'string',
    default: '*',
  },
  'Access-Control-Allow-Credentials': {
    type: 'boolean',
    default: true,
  },
};

/**
 * These functions are helpers to create OpenAPI documentation.
 * You can have some more documentation about OpenAPI schemas here :
 * https://swagger.io/specification/v2/
 */
libs.make = {
  /**
   * Create and return a new swagger API parameter
   * @param {string} name The name of this parameter
   * @param {string} place The location of this parameter (query, path, header, body, form)
   * @param {string} type The type of this parameter (integer, number, string, boolean)
   * @param {boolean} required If this parameter is required. Can be omitted.
   * @param {string} description The description of this parameter
   * @param {object} extra An object of extra parameters to add. Can be omitted.
   */
  param(name, place, type, required, description = undefined, extra = {}) {
    const ret = {
      name,
      in: place,
      required: !!required,
      description,
      type,
      ...extra,
    };

    return (ret);
  },

  /**
   * Create and return a new swagger API body description (JSON only here)
   * @param {string} description The description of this content
   * @param {boolean} required If the request body is required
   * @param {string} schema The schema of this request body
   * @param {object} extra Extra parameters (can be used to add examples & else.)
   */
  requestBody(description, required, schema, extra = {}) {
    const ret = {
      description,
      required: !!required,
      content: {
        'application/json': {
          schema,
          ...extra,
        },
      },
    };

    return (ret);
  },

  /**
   * Create and return a new output API parameter
   * @param {string} description The description of this parameter
   * @param {string} type The type of this parameter (integer, number, string, boolean)
   * @param {boolean} required If this parameter is required. Can be omitted.
   * @param {object} extra An object of extra parameters to add. Can be omitted.
   */
  outParam(description, type, required, extra = {}) {
    const ret = {
      description,
      type,
      required: !!required,
      ...extra,
    };

    return (ret);
  },

  /**
   * Creates a new method object
   * @param {string} description The description of this method
   * @param {array} tags Array of tags to add to this method.
   */
  method(description, tags = undefined) {
    return ({
      description,
      tags,
      responses: {},
    });
  },

  /**
   * Creates a new response object
   * @param {string} description The description of this response
   * @param {object|undefined} schema The schema for this response
   * @param {object} headers Headers included in the output
   * @param {array} examples Some examples, if any
   * @param {object} extra Extra parameters to add to this response, if any
   */
  response(
    description,
    schema = undefined,
    headers = defaultRespHeaders,
    examples = [],
    extra = {},
  ) {
    const ret = {
      description,
      content: {
        'application/json': {
          schema,
        },
      },
      headers,
      examples,
      ...extra,
    };

    return (ret);
  },

  /**
   * Creates a new response object, with default values for standard error output format.
   * @param {string} description The description of this error
   * @param {object} extra Extra parameters to add to this response, if any
   */
  responseError(description, extra = {}) {
    const ret = {
      description,
      schema: {
        type: 'object',
        required: [
          'message',
        ],
        properties: {
          message: {
            type: 'string',
            description: 'The error string, most often a token that will be translatable by the client',
          },
        },
      },
      headers: defaultRespHeaders,
      ...extra,
    };

    return (ret);
  },

  /**
   * Creates an object schema
   * @param {object} properties The properties for this schema
   * @param {object} extra Extra parameters to add to this schema, if any
   */
  schemaObject(properties, extra = {}) {
    const ret = {
      type: 'object',
      properties,
      ...extra,
    };

    return (ret);
  },

  /**
   * Creates an array schema
   * @param {object} items The item schema that will be included in this array
   * @param {object} extra Extra parameters to add to this schema, if any
   */
  schemaArray(items, extra = {}) {
    const ret = {
      type: 'array',
      items,
      ...extra,
    };

    return (ret);
  },

  /**
   * Creates a schema by reference
   * @param {string} name The schema name (Joined by slashes)
   */
  schemaRef(...name) {
    const ret = {
      $ref: `#/components/${name.join('/')}`,
    };

    return (ret);
  },
};

libs.checks = {
  forMissingAPIs(slsConfig, swaggerConfig) {
    Object.keys(slsConfig.functions).forEach((fnName) => {
      const fn = slsConfig.functions[fnName];
      if (fn.events) {
        fn.events.forEach((event) => {
          if (!event || !event.http || !event.http.path) {
            return;
          }

          const path = `/${event.http.path}`;
          const { method } = event.http;
          if (!Object.prototype.hasOwnProperty.call(swaggerConfig.paths, path)) {
            // eslint-disable-next-line no-console
            console.error(`Missing API documentation for : ${path} (Method ${method})`);
          } else if (!Object.prototype.hasOwnProperty.call(swaggerConfig.paths[path], method)) {
            // eslint-disable-next-line no-console
            console.error(`Missing API documentation for : ${path} (Method ${method})`);
          }
        });
      }
    });
  },
};

export default libs;
