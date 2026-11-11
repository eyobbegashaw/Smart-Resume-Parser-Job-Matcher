const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env before importing app/middleware
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (process.env.NODE_ENV !== 'test') {
  console.warn(
    `Warning: ${envPath} was not found. Copy backend/.env.example to backend/.env and configure MONGODB_URI and JWT_SECRET.`
  );
}

const App = require('./app');
const logger = require('./utils/logger');

const application = new App();

if (require.main === module) {
  application.start().catch((err) => {
    logger.error('Failed to start server:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
    process.exit(1);
  });
} else {
  application.configure();
}

module.exports = application.app;
