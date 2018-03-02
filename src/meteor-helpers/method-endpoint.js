import request from 'request-promise';
import environment from '../utils/environment-helpers';
import { METHOD_ENDPOINT_SECRET, METHOD_ENDPOINT_BASE } from '../config';

const protocol = environment.isDev() ? 'http' : 'https';

export const callMethodAtEndpoint = async (methodName, headers = {}, methodArgs) => {
  const url = `${protocol}://${process.env.METEOR_URL}/${METHOD_ENDPOINT_BASE}/v1/`;
  headers['x-requestor-shared-secret'] = METHOD_ENDPOINT_SECRET;
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
