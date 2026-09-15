import express from 'express';

import routes from './routes/index.js';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1', routes);

export default app;
