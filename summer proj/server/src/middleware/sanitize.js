import mongoSanitize from 'express-mongo-sanitize';

const STRIP_HTML = /<[^>]*>|<\/[^>]*>/g;

function stripHtml(value) {
  if (typeof value === 'string') {
    return value.replace(STRIP_HTML, '').trim();
  }
  if (Array.isArray(value)) {
    return value.map(stripHtml);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, stripHtml(v)])
    );
  }
  return value;
}

export const sanitize = [
  mongoSanitize(),
  (req, _res, next) => {
    req.body = stripHtml(req.body);
    req.query = stripHtml(req.query);
    next();
  }
];
