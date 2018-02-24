// import { PubSub } from 'graphql-subscriptions';
// module.exports = new PubSub();
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

const { REDIS_URL, REDIS_PORT, REDIS_PASSWORD } = process.env;
const options = {
  host: REDIS_URL,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  retry_strategy: opts => Math.max(opts.attempt * 100, 3000),
};

const pubsub = new RedisPubSub({
  publisher: new Redis(options),
  subscriber: new Redis(options),
});

module.exports = pubsub;
