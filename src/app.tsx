import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { LocaleProvider } from '@arcblock/ux/lib/Locale/context';
import { useEffect } from 'react';
import TodoList from './pages/todo-list';
import Layout from './components/layout';
import { SessionProvider } from './contexts/session';
import getWsClient from './libs/ws';

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="" element={<TodoList />} />
        </Route>
      </Routes>
    </div>
  );
}

export default function WrappedApp() {
  // While the blocklet is deploy to a sub path, this will be work properly.
  const basename = window?.blocklet?.prefix || '/';

  useEffect(() => {
    const wsClient = getWsClient();
    wsClient.connect();

    return () => {
      if (wsClient.isConnected()) {
        wsClient.disconnect();
      }
    };
  }, []);

  return (
    <SessionProvider>
      <LocaleProvider translations={{}}>
        <Router basename={basename}>
          <App />
        </Router>
      </LocaleProvider>
    </SessionProvider>
  );
}
