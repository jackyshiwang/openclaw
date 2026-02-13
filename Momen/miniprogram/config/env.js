const env = {
  dev: {
    baseUrl: 'http://localhost:3000'
  },
  prod: {
    baseUrl: 'http://<YOUR_SERVER_IP>:3000' // Replace with your actual server IP or domain
  }
};

// Toggle this to switch environments
const currentEnv = 'dev'; // 'dev' or 'prod'

const config = env[currentEnv];

module.exports = {
  config,
  currentEnv
};

