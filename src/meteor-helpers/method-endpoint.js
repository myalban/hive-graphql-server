import request from 'request-promise';

export const callMethodAtEndpoint = async (methodName, headers = {}, methodArgs) => {
  const url = `https://${process.env.METEOR_URL}hvmethods/v1/`;
  const options = {
    method: 'POST',
    headers,
    url: url + methodName,
    json: methodArgs,
  };
  const response = await request(options);
  return response.data;
};
