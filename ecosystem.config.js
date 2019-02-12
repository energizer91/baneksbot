module.exports = {
  apps: [{
    name: 'baneksbot',
    script: './dist/index.js',
    env: {
      NODE_ENV: 'development',
      DEBUG: 'baneks-node:*'
    },
    env_production: {
      NODE_ENV: 'production',
      DEBUG: 'baneks-node:*:error'
    }
  }]
};
