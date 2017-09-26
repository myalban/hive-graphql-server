import 'babel-polyfill';
import graphql from 'graphql';
import { describe, it } from 'mocha';
import { expect } from 'chai';
const request = require('request-promise');

function graphqlQuery(query) {
  return request({
    baseUrl: 'http://localhost:3030',
    uri: '/graphql',
    qs: {
      graphqlQuery: query,
    },
    resolveWithFullResponse: true,
    json: true,
  });
}

describe('Integration', () => {
  it('Should resolve action', () => {
    const query = `{
      action(id:1) {
        id
      }
    }`;

    const expected = {
      pokemon: {
        id: '1',
      },
    };

    return graphqlQuery(query)
      .then((response) => {
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.have.deep.equals(expected);
      });
  });
});
