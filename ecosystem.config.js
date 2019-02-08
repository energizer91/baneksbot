module.exports = {
  apps: [{
    name: 'baneksbot',
    script: './dist/bin/www.js',
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
