import request from 'request-promise';

export const callMethodAtEndpoint = async (methodName, headers = {}, methodArgs) => {
  const url = `https://${process.env.METEOR_URL}/hvmethods/v1/`;
  const options = {
    method: 'POST',
    headers,
    // we are getting a cert reject from aws for some reason
    // this is a temporary fix only until we figure out why
    // the cert is throwing this error
    rejectUnauthorized: false,
    url: url + methodName,
    json: methodArgs,
  };
  const response = await request(options);
  return response.data;
};
