import request from 'request-promise';

export const callMethodAtEndpoint = async (methodName, methodArgs) => {
  const url = 'http://localhost:3000/hvmethods/v1/';
  const options = {
    method: 'POST',
    url: url + methodName,
    json: methodArgs,
  };
  const response = await request(options);
  return response.data;
};
