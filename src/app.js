import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import pinoHttp from 'pino-http';

import logger from './config/logger.js';
import docsRoutes from './routes/docs.routes.js';
import routes from './routes/index.js';
import responder from './middlewares/responder.js';
import notFound from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';
import ipGuard from './middlewares/ipGuard.js';
import { corsOrigins } from './config/env.js';
import { globalLimiter } from './middlewares/rateLimiter.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(cors({ origin: corsOrigins, credentials: true, maxAge: 86400 }));
app.use(compression());
app.use(pinoHttp({ logger, customLogLevel: (req, res) => (res.statusCode >= 500 ? 'error' : 'info') }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize({ replaceWith: '_' }));
app.use(hpp());

app.use(responder);
app.use(ipGuard);
app.use(globalLimiter);

app.use('/docs', docsRoutes);
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
