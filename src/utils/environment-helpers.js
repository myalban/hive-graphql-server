export default {
  getEnv: () => process.env.NODE_ENV,
  isDev: () => process.env.NODE_ENV === 'dev',
  isTest: () => process.env.NODE_ENV === 'test',
  isStaging: () => process.env.NODE_ENV === 'staging',
  isProduction: () => process.env.NODE_ENV === 'prod',
};
