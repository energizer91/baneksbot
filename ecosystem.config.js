module.exports = {
  apps: [{
    name: 'baneksbot',
    script: './bin/www',
    env: {
      NODE_ENV: 'development',
      DEBUG: '*'
    },
    env_production: {
      NODE_ENV: 'production',
      DEBUG: 'baneks-node:*:error'
    }
  }]
};
