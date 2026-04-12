import Rollbar from 'rollbar';
import dotenv from 'dotenv';

dotenv.config();

const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
  environment: process.env.NODE_ENV || 'development',
  captureUncaught: true,
  captureUnhandledRejections: true,
  enabled: process.env.NODE_ENV === 'production',
  payload: {
    client: {
      javascript: {
        code_version: '1.0.0',
        source_map_enabled: false
      }
    }
  }
});

export default rollbar;