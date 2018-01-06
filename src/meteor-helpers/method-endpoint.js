import request from 'request-promise';

export const callMethodAtEndpoint = async (methodName, headers = {}, methodArgs) => {
  const url = 'http://localhost:3000/hvmethods/v1/';
  const options = {
    method: 'POST',
    headers,
    url: url + methodName,
    json: methodArgs,
  };
  const response = await request(options);
  return response.data;
};
