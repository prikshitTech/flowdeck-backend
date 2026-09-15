import express from 'express';
import pinoHttp from 'pino-http';

import logger from './config/logger.js';
import routes from './routes/index.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(pinoHttp({ logger, customLogLevel: (req, res) => (res.statusCode >= 500 ? 'error' : 'info') }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', routes);

export default app;
