import request from 'request-promise';
import environment from '../utils/environment-helpers';

const protocol = environment.isDev() ? 'http' : 'https';

export const callMethodAtEndpoint = async (methodName, headers = {}, methodArgs) => {
  const url = `${protocol}://${process.env.METEOR_URL}/hvmethods/v1/`;
  const options = {
    method: 'POST',
    headers,
    url: url + methodName,
    json: methodArgs,
  };
  try {
    const response = await request(options);
    return response.data;
  } catch (methodError) {
    throw new Error(`
      Error calling method ${methodName} at ${url}:
      ${methodError}
    `);
  }
};
