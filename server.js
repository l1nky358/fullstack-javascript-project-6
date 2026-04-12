import 'dotenv/config';
import app from './src/index.js';
import rollbar from './src/lib/rollbar.js';

const port = process.env.PORT || 3000;

const start = async () => {
  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`✅ Server running on http://localhost:${port}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.NODE_ENV === 'production') {
      console.log(`📊 Rollbar monitoring active`);
    }
  } catch (err) {
    console.error('❌ Error starting server:', err);
    rollbar.critical('Failed to start server', err);
    process.exit(1);
  }
};

start();