const Joi = require('joi');
const DOMPurify = require('isomorphic-dompurify');

const schemas = {
  createPitchbook: Joi.object({
    title: Joi.string().min(1).max(255).required()
      .pattern(/^[a-zA-Z0-9\s\-_.,!?]+$/)
      .messages({
        'string.pattern.base': 'Title contains invalid characters'
      }),
    type: Joi.string().valid('standard', 'template', 'custom').default('standard'),
    sections: Joi.array().items(
      Joi.object({
        title: Joi.string().max(255).required(),
        numberOfSlides: Joi.number().integer().min(1).max(100).default(1),
        prompt: Joi.string().max(5000).allow('')
      })
    ).min(1).max(50).required(),
    pitchbookPrompt: Joi.string().max(10000).allow(''),
    inheritTemplatePrompts: Joi.boolean().default(true)
  }),

  updatePitchbook: Joi.object({
    title: Joi.string().min(1).max(255),
    prompts: Joi.object().pattern(
      Joi.string(),
      Joi.object().pattern(
        Joi.string(),
        Joi.string().max(5000)
      )
    ),
    status: Joi.string().valid('draft', 'generating', 'ready', 'archived')
  }),

  queryParams: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('created_at', 'updated_at', 'title').default('updated_at'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    status: Joi.string().valid('draft', 'generating', 'ready', 'archived'),
    search: Joi.string().max(100)
  }),

  slideUpdate: Joi.object({
    content: Joi.object(),
    prompt: Joi.string().max(5000).allow(''),
    notes: Joi.string().max(2000).allow('')
  }),

  batchSlideUpdate: Joi.object({
    updates: Joi.array().items(
      Joi.object({
        slide_id: Joi.string().uuid().required(),
        content: Joi.object(),
        prompt: Joi.string().max(5000).allow('')
      })
    ).min(1).max(100).required()
  })
};

class PitchbookValidator {
  static validate(schemaName, data) {
    const schema = schemas[schemaName];
    if (!schema) {
      throw new Error(`Validation schema '${schemaName}' not found`);
    }

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.errors = errors;
      validationError.statusCode = 400;
      throw validationError;
    }

    return this.sanitize(value);
  }

  static sanitize(data) {
    const sanitized = JSON.parse(JSON.stringify(data)); // Deep clone

    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      // Remove any HTML tags and scripts
      return DOMPurify.sanitize(str, { 
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true
      }).trim();
    };

    const recursiveSanitize = (obj) => {
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(recursiveSanitize);
      }
      if (obj && typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = recursiveSanitize(value);
        }
        return result;
      }
      return obj;
    };

    return recursiveSanitize(sanitized);
  }

  static validateId(id) {
    const { error } = Joi.string().uuid().validate(id);
    if (error) {
      const validationError = new Error('Invalid ID format');
      validationError.name = 'ValidationError';
      validationError.statusCode = 400;
      throw validationError;
    }
    return id;
  }

  static validatePagination(params) {
    return this.validate('queryParams', params);
  }
}

module.exports = PitchbookValidator;