// import { PubSub } from 'graphql-subscriptions';
// module.exports = new PubSub();
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

const REDIS_DOMAIN_NAME = 'localhost';
const PORT_NUMBER = 6379;
const options = {
  host: REDIS_DOMAIN_NAME,
  port: PORT_NUMBER,
  retry_strategy: opts => Math.max(opts.attempt * 100, 3000),
};

const pubsub = new RedisPubSub({
  publisher: new Redis(options),
  subscriber: new Redis(options),
});

module.exports = pubsub;
