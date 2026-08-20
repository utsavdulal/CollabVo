import { ApiError } from './error.js';

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      return next(new ApiError(400, `Validation failed: ${message}`));
    }
    req[source] = result.data;
    next();
  };
}

export function validateUploads(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      ...req.body,
      files: req.files || []
    });
    if (!result.success) {
      const message = result.error.issues.map(i => i.message).join(', ');
      return next(new ApiError(400, `Validation failed: ${message}`));
    }
    next();
  };
}
