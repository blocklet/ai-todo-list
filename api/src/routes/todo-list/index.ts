import { Router, Request, Response, NextFunction } from 'express';
// import { nanoid } from 'nanoid';
import { GetObjectCommand, PutObjectCommand, SpaceClient } from '@did-space/client';
import { streamToString } from '@did-space/core';
import middleware from '@blocklet/sdk/lib/middlewares';
import { Worker } from 'snowflake-uuid';
import { isNil } from 'lodash';
import Joi from 'joi';
import dayjs from 'dayjs';
import { authService, wallet } from '../../libs/auth';
import wsServer from '../../ws';
import logger from '../../libs/logger';

const todoKey = 'todo-list.json';

const idGenerator = new Worker();
const nanoid = () => idGenerator.nextId().toString();

const hasMinutes = (timeString: string) => {
  if (!dayjs(timeString).isValid()) {
    return false;
  }
  return timeString.includes(':');
};

const areDatesEqual = (dateTime1: any, dateTime2: any, minutes: boolean) => {
  if (minutes) {
    return dayjs(dateTime1).format('YYYY-MM-DD HH:mm') === dayjs(dateTime2).format('YYYY-MM-DD HH:mm');
  }

  return dayjs(dateTime1).format('YYYY-MM-DD') === dayjs(dateTime2).format('YYYY-MM-DD');
};
const router = Router();

const inputSchema = Joi.object<{
  title: string;
  todoTime?: string;
  todoKeyword?: string;
}>({
  title: Joi.string().required(),
  todoTime: Joi.string().optional().allow('').empty(['', null]),
  todoKeyword: Joi.string().optional().allow('').empty(['', null]),
}).unknown(true);

const viewSchema = Joi.object<{
  todoTime?: string;
  todoKeyword?: string;
}>({
  todoTime: Joi.string().optional().allow('').empty(['', null]),
  todoKeyword: Joi.string().optional().allow('').empty(['', null]),
}).unknown(true);

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  updatedAt: string;
  todoTime?: string;
  todoKeyword?: string;
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
 *     parameters:
 *       - in: query
 *         name: todoTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter todos by time.
 *         x-description-zh: 按时间筛选待办事项。
 *       - in: query
 *         name: todoKeyword
 *         schema:
 *           type: string
 *         description: Filter todos by keyword.
 *         x-description-zh: 按关键词筛选待办事项。
 *     responses:
 *       '200':
 *         description: Successful operation. Returns a list of todos.
 *         x-description-zh: 操作成功。返回待办事项列表。
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
 *                         x-description-zh: 待办事项的唯一标识符
 *                       title:
 *                         type: string
 *                         description: The title of the todo item.
 *                         x-description-zh: 待办事项的标题
 *                       completed:
 *                         type: boolean
 *                         description: Indicates whether the todo item is completed or not.
 *                         x-description-zh: 指示待办事项是否已完成
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: The timestamp when the todo item was last updated.
 *                         x-description-zh: 上次更新待办事项的时间戳
 *                       todoKeyword:
 *                         type: string
 *                         description: The keyword of the todo.
 *                         x-description-zh: 待办事项的关键词
 *                       todoTime:
 *                         type: string
 *                         format: date-time
 *                         description: The time of the todo.
 *                         x-description-zh: 待办事项的时间
 *       '400':
 *         description: Bad request. An error occurred while processing the request.
 *         x-description-zh: 错误请求。处理请求时出现错误。
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const input = await viewSchema.validateAsync(req.query, { stripUnknown: true });
    const list = req.todoList
      .filter((todo) => {
        if (input?.todoKeyword) {
          return (todo.todoKeyword || '')?.includes(input?.todoKeyword) || todo.title.includes(input.todoKeyword);
        }

        return true;
      })
      .filter((todo) => {
        if (input?.todoTime && todo.todoTime) {
          if (!dayjs(input?.todoTime).isValid()) {
            return true;
          }

          return areDatesEqual(input?.todoTime, todo.todoTime, hasMinutes(input.todoTime));
        }

        return true;
      });

    res.json({ list });
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
 *                 description: The key title of the todo
 *                 x-description-zh: 待办事项的关键标题
 *               todoKeyword:
 *                 type: string
 *                 description: The keyword of the todo
 *                 x-description-zh: 待办事项的关键词
 *               todoTime:
 *                 type: string
 *                 format: date-time
 *                 description: The time of the todo
 *                 x-description-zh: 待办事项的时间
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
 *                       x-description-zh: 待办事项的唯一标识符
 *                     title:
 *                       type: string
 *                       description: The title of the todo item.
 *                       x-description-zh: 待办事项的标题
 *                     completed:
 *                       type: boolean
 *                       description: Indicates whether the todo item is completed or not.
 *                       x-description-zh: 指示待办事项是否已完成
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: The timestamp when the todo item was last updated.
 *                       x-description-zh: 上次更新待办事项的时间戳
 *                     todoKeyword:
 *                       type: string
 *                       description: The keyword of the todo.
 *                       x-description-zh: 待办事项的关键词
 *                     todoTime:
 *                       type: string
 *                       format: date-time
 *                       description: The time of the todo.
 *                       x-description-zh: 待办事项的时间
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const input = await inputSchema.validateAsync(req.body, { stripUnknown: true });
    let todoTime = dayjs().format('YYYY-MM-DD');
    try {
      if (input.todoTime) {
        todoTime = dayjs(input.todoTime).format('YYYY-MM-DD HH:mm');
      }
    } catch (error) {
      console.error(error?.message);
      todoTime = dayjs().format('YYYY-MM-DD');
    }

    const newTodo = {
      id: nanoid(),
      title: input.title,
      completed: false,
      updatedAt: new Date().toISOString(),
      todoKeyword: input.todoKeyword || '',
      todoTime,
    };

    const { todoList } = req;
    todoList.push(newTodo);
    await req.spaceClient.send(new PutObjectCommand({ key: todoKey, data: JSON.stringify(todoList) }));
    wsServer.broadcast('todo:add', { todo: newTodo, userId: req.user?.did });

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
    const { title, completed, todoTime } = req.body;
    const { todoList } = req;
    const index = todoList.findIndex((todo: any) => todo.id === id);
    if (index !== -1) {
      const params = {
        ...(!isNil(title) ? { title } : {}),
        ...(!isNil(completed) ? { completed } : {}),
        ...(!isNil(todoTime) ? { todoTime: dayjs(todoTime).format('YYYY-MM-DD HH:mm') } : {}),
      };
      const updateTodo = { ...todoList[index], ...params } as Todo;
      todoList[index] = updateTodo;
      await req.spaceClient.send(new PutObjectCommand({ key: todoKey, data: JSON.stringify(todoList) }));
      wsServer.broadcast('todo:update', { todo: updateTodo, userId: req.user?.did });

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
      wsServer.broadcast('todo:delete', { todo: deletedTodo, userId: req.user?.did });

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
