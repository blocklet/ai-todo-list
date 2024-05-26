import { useEffect } from 'react';
import { WsClient } from '@arcblock/ws';
import Cookie from 'js-cookie';

import { useSessionContext } from '../contexts/session';
import { Todo } from './todo';

let client: any;

function create() {
  const pathPrefix = window.blocklet?.prefix || '/';
  const url = `//${window.location.host}${pathPrefix.replace(/\/$/, '')}`;

  return new WsClient(url, {
    heartbeatIntervalMs: 10 * 1000,
    params: () => ({
      token: Cookie.get('login_token'), // 作用: 这里的使用场景是 当 blocklet 是配置了访问控制的话 ws 请求需要带上 login_token
    }),
  });
}

export default function getWsClient() {
  if (!client) {
    client = create();
  }

  return client;
}

export const useSubscription: (event: any, cb?: ({ todo }: { todo: Todo }) => void, deps?: any[]) => void = (
  event: any,
  cb = () => {},
  deps = []
) => {
  const { session } = useSessionContext();
  if (!client) {
    client = getWsClient();
  }

  useEffect(() => {
    client.on(event, cb);

    return () => {
      client.off(event, cb);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, session.user]);
};
