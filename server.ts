// Smart Community Intelligence Platform (SCIP) - Full Stack Server Entry
import { startServer } from './src/server/app.ts';

startServer().catch((err) => {
  // Avoid leaking stack traces, secrets, or environment details in production logs.
  const safeMessage = err instanceof Error ? err.message : 'Unknown startup error';
  if (process.env.NODE_ENV === 'production') {
    console.error('[SCIP Server] Fatal startup error.');
  } else {
    console.error('[SCIP Server] Fatal startup error:', safeMessage);
  }
  process.exit(1);
});

