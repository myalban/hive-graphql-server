import request from 'request';

export const callMethodAtEndpoint = async (methodName, methodArgs) => {
  const url = 'http://localhost:3000/hvmethods/v1/';
  const options = {
    method: 'POST',
    url: url + methodName,
    json: methodArgs,
  };
  const response = await request(options);
  const result = JSON.parse(response.body)[0];
  return result;
};
