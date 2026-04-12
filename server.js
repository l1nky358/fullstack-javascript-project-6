import app from './src/index.js';

const port = process.env.PORT || 3000;

const start = async () => {
  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Server running on port ${port}`);
    console.log(`Visit: http://localhost:${port}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

start();