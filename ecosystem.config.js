module.exports = {
  apps: [{
    name: 'baneksbot',
    script: './bin/www',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
}
