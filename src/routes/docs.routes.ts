import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

import document from '../docs/openapi.js';

const router = Router();

router.get('/openapi.json', (req, res) => res.json(document));

router.use('/', swaggerUi.serve, swaggerUi.setup(document, {
  customSiteTitle: 'FlowDeck API',
  swaggerOptions: { persistAuthorization: true, docExpansion: 'none', tagsSorter: 'alpha' }
}));

export default router;
