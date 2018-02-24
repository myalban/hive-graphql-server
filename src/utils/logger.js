import os from 'os';
import winston from 'winston';
import { Papertrail } from 'winston-papertrail';

import environment from './environment-helpers';
import { PAPERTRAIL_HOST, PAPERTRAIL_PORT } from '../config';

const transports = [
  new winston.transports.Console({
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true
  })
];
if (environment.isProduction() || environment.isStaging()) {
  const papertrailOptions = {
    host: PAPERTRAIL_HOST,
    port: PAPERTRAIL_PORT,
    hostname: `graphql-${environment.getEnv()}-${os.hostname()}`,
    handleExceptions: true,
    colorize: false,
  };
  const pt = new Papertrail(papertrailOptions);
  transports.push(pt);
}

const logger = new winston.Logger({
  transports
});

logger.stream = {
  write: function write(message) {
    logger.info(message);
  }
};


export default logger;
