import 'express-async-errors';

import path from 'path';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv-flow';
import express, { ErrorRequestHandler } from 'express';
import fallback from '@blocklet/sdk/lib/middlewares/fallback';
import { createDatasetAPIRouter } from '@blocklet/dataset-sdk/openapi';
import { getComponentsRouter } from '@blocklet/components-sdk';
import logger from './libs/logger';
import routes from './routes';
import wsServer from './ws';

dotenv.config();

const { name, version } = require('../../package.json');

export const app = express();

app.set('trust proxy', true);
app.use(cookieParser());
app.use(express.json({ limit: '1 mb' }));
app.use(express.urlencoded({ extended: true, limit: '1 mb' }));
app.use(cors());

app.use(
  '/',
  createDatasetAPIRouter('TODO', path.join(process.env.BLOCKLET_APP_DIR!, 'dataset.yml'), {
    apis: [path.join(__dirname, './routes/**/*.*')],
  })
);
app.use('/', getComponentsRouter());

const router = express.Router();
router.use('/api', routes);
app.use(router);

const isProduction = process.env.NODE_ENV === 'production' || process.env.ABT_NODE_SERVICE_ENV === 'production';

if (isProduction) {
  const staticDir = path.resolve(process.env.BLOCKLET_APP_DIR!, 'dist');
  app.use(express.static(staticDir, { maxAge: '30d', index: false }));
  app.use(fallback('index.html', { root: staticDir }));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use(<ErrorRequestHandler>((err, _req, res, _next) => {
    logger.error(err.stack);
    res.status(500).send('Something broke!');
  }));
}

const port = parseInt(process.env.BLOCKLET_PORT!, 10);

export const server = app.listen(port, (err?: any) => {
  if (err) throw err;
  logger.info(`> ${name} v${version} ready on ${port}`);
});

wsServer.attach(server);