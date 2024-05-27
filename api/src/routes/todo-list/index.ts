import { Router, Request, Response, NextFunction } from 'express';
// import { nanoid } from 'nanoid';
import { GetObjectCommand, PutObjectCommand, SpaceClient } from '@did-space/client';
import { streamToString } from '@did-space/core';
import middleware from '@blocklet/sdk/lib/middlewares';
import { Worker } from 'snowflake-uuid';
import { isNil } from 'lodash';
import { authService, wallet } from '../../libs/auth';
import wsServer from '../../ws';
import logger from '../../libs/logger';

const todoKey = 'todo-list.json';

const idGenerator = new Worker();

const nanoid = () => idGenerator.nextId().toString();

const router = Router();

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  updatedAt: string;
}

// eslint-disable-next-line consistent-return
async function spaceClientMiddleware(req: Request, res: Response, next: NextFunction) {
  const { user } = await authService.getUser(req.user?.did as string);
  if (!user?.didSpace?.endpoint) {
    return res.status(404).send('DID Spaces endpoint does not exist. Log in again to complete the authorization');
  }

  const spaceClient = new SpaceClient({ wallet, endpoint: user.didSpace.endpoint });
  let result;

  try {
    result = await spaceClient.send(new GetObjectCommand({ key: todoKey }));
    if (result.statusCode !== 200) {
      logger.error(result.statusMessage);
    }
  } catch (error) {
    logger.error(error?.message);
  }

  req.spaceClient = spaceClient;
  req.todoList = result?.statusCode === 200 ? (JSON.parse(await streamToString(result.data)) as Todo[]) : [];
  next();
}

router.use(middleware.user(), spaceClientMiddleware);

/**
 * @openapi
 * /api/todos:
 *   get:
 *     summary: Get all todos
 *     description: Retrieve a list of all todo items.
 *     x-summary-zh: 获取所有待办事项
 *     x-description-zh: 检索所有待办事项列表。
 *     responses:
 *       '200':
 *         description: Successful operation. Returns a list of todos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: The unique identifier of the todo item.
 *                       title:
 *                         type: string
 *                         description: The title of the todo item.
 *                       completed:
 *                         type: boolean
 *                         description: Indicates whether the todo item is completed or not.
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: The timestamp when the todo item was last updated.
 *       '400':
 *         description: Bad request. An error occurred while processing the request.
 */
router.get('/', (req: Request, res: Response) => {
  try {
    res.json({ list: req.todoList });
  } catch (error) {
    console.error(error);
    res.status(400).send(error.message);
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const todo = req.todoList.find((x: Todo) => x.id === id);
    if (todo) {
      res.json({ todo });
    } else {
      res.status(404).send('Todo not found');
    }
  } catch (error) {
    console.error(error);
    res.status(400).send(error.message);
  }
});

/**
 * @openapi
 * /api/todos:
 *   post:
 *     summary: Create a new todo
 *     description: Create a new todo item.
 *     x-summary-zh: 创建新的待办事项
 *     x-description-zh: 创建新的待办事项。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: The title of the todo
 *     responses:
 *       '200':
 *         description: Successful operation. Returns the requested todo item.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 todo:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: The unique identifier of the todo item.
 *                     title:
 *                       type: string
 *                       description: The title of the todo item.
 *                     completed:
 *                       type: boolean
 *                       description: Indicates whether the todo item is completed or not.
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: The timestamp when the todo item was last updated.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const newTodo = {
      id: nanoid(),
      title,
      completed: false,
      updatedAt: new Date().toISOString(),
    };
    const { todoList } = req;
    todoList.push(newTodo);
    await req.spaceClient.send(new PutObjectCommand({ key: todoKey, data: JSON.stringify(todoList) }));
    wsServer.broadcast('todo:add', { todo: newTodo });

    res.json({ todo: newTodo });
  } catch (error) {
    console.error(error);
    res.status(400).send(error.message);
  }
});

/**
 * @openapi
 * /api/todos/{id}:
 *   put:
 *     summary: Update a todo by ID
 *     description: Update a todo item by its ID.
 *     x-summary-zh: 通过ID更新待办事项
 *     x-description-zh: 通过其ID更新待办事项。
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the todo to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: The new title of the todo
 *               completed:
 *                 type: boolean
 *                 description: The new completion status of the todo
 *     responses:
 *       '200':
 *         description: Successful operation. Returns the requested todo item.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 todo:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: The unique identifier of the todo item.
 *                     title:
 *                       type: string
 *                       description: The title of the todo item.
 *                     completed:
 *                       type: boolean
 *                       description: Indicates whether the todo item is completed or not.
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: The timestamp when the todo item was last updated.
 *       '404':
 *         description: Todo not found
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, completed } = req.body;
    const { todoList } = req;
    const index = todoList.findIndex((todo: any) => todo.id === id);
    if (index !== -1) {
      const params = {
        ...(!isNil(title) ? { title } : {}),
        ...(!isNil(completed) ? { completed } : {}),
      };
      const updateTodo = { ...todoList[index], ...params } as Todo;
      todoList[index] = updateTodo;
      await req.spaceClient.send(new PutObjectCommand({ key: todoKey, data: JSON.stringify(todoList) }));
      wsServer.broadcast('todo:update', { todo: updateTodo });

      res.json({ todo: updateTodo });
    } else {
      res.status(404).send('Todo not found');
    }
  } catch (error) {
    console.error(error);
    res.status(400).send(error.message);
  }
});

/**
 * @openapi
 * /api/todos/{id}:
 *   delete:
 *     summary: Delete a todo by ID
 *     description: Delete a todo item by its ID.
 *     x-summary-zh: 通过ID删除待办事项
 *     x-description-zh: 通过其ID删除待办事项。
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the todo to delete
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation. Returns the requested todo item.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 todo:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: The unique identifier of the todo item.
 *                     title:
 *                       type: string
 *                       description: The title of the todo item.
 *                     completed:
 *                       type: boolean
 *                       description: Indicates whether the todo item is completed or not.
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: The timestamp when the todo item was last updated.
 *       '404':
 *         description: Todo not found
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { todoList } = req;
    const index = todoList.findIndex((todo: any) => todo.id === id);
    if (index !== -1) {
      const deletedTodo = todoList.splice(index, 1)[0];
      await req.spaceClient.send(new PutObjectCommand({ key: todoKey, data: JSON.stringify(todoList) }));
      wsServer.broadcast('todo:delete', { todo: deletedTodo });

      res.json({ todo: deletedTodo });
    } else {
      res.status(404).send('Todo not found');
    }
  } catch (error) {
    console.error(error);
    res.status(400).send(error.message);
  }
});

export default router;
