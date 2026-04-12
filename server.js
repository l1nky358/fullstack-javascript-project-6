import 'dotenv/config';
import buildApp from './src/index.js';

const port = process.env.PORT || 3000;

const start = async () => {
  try {
    const app = await buildApp();
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`✅ Server running on http://localhost:${port}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (err) {
    console.error('❌ Error starting server:', err);
    process.exit(1);
  }
};

start();
