import { WsServer } from '@arcblock/ws';
import logger from './libs/logger';

logger.debug = () => null;

function createWebsocketServer() {
  const wsServer = new WsServer({
    logger,
    pathname: '/websocket',
  });

  return wsServer;
}

export default createWebsocketServer();
