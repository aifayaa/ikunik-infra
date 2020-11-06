import yaml from 'js-yaml';

const libs = {};

/**
 * Included yaml library allowing us to load serverless files and
 * check that everything is documented. That check function should to be written here
 * and executed in each service.
 */
libs.yaml = yaml;

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
   * @param {string} place The location of this parameter (query, url, header, body, form)
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
      schema,
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
   * @param {object} name The schema name
   * @param {object} extra Extra parameters to add to this schema, if any
   */
  schemaRef(name, extra = {}) {
    const ret = {
      $ref: `#/definitions/${name}`,
      ...extra,
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
          if (!Object.prototype.hasOwnProperty.call(swaggerConfig.paths, `/${event.http.path}`)) {
            // eslint-disable-next-line no-console
            console.error('Missing API documentation for :', event.http.path);
          }
        });
      }
    });
  },
};

export default libs;
