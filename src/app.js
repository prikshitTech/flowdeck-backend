import express from 'express';
import pinoHttp from 'pino-http';

import logger from './config/logger.js';
import routes from './routes/index.js';
import responder from './middlewares/responder.js';
import notFound from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(pinoHttp({ logger, customLogLevel: (req, res) => (res.statusCode >= 500 ? 'error' : 'info') }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(responder);

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
