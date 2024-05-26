declare module 'vite-plugin-blocklet';

declare module 'express-history-api-fallback';

declare module 'express-async-errors';

declare module '@arcblock/ws';
namespace Express {
  interface Request {
    user?: {
      did: string;
      role: string;
      fullName: string;
      provider: string;
      walletOS: string;
    };
    spaceClient: any;
    todoList: {
      id: string;
      title: string;
      completed: boolean;
      updatedAt: string;
    }[];
  }
}
