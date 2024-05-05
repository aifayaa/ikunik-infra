export function CrowdaaException(
  type,
  code,
  message,
  { httpCode = null } = {}
) {
  if (!(this instanceof CrowdaaException)) {
    return new CrowdaaException(type, code, message);
  }

  const internalException = new Error(message);
  this.message = message;
  this.stack = internalException.stack;
  this.type = type;
  this.code = code;
  this.httpCode = httpCode || 200;

  this.toString = () => internalException.toString();
}
