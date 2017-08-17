import { formatError } from 'graphql';

// Overwrites default error format but ensuring
// the `field` custom value we used in our `ValidationError`
// class is present when errors are sent to client.
module.exports = error => {
  const data = formatError(error);
  const { originalError } = error;
  data.field = originalError && originalError.field;
  return data;
};
