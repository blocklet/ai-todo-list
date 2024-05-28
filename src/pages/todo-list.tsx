import React, { useState, useEffect } from 'react';
import {
  Grid,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  styled,
  Popper,
  IconButton,
  ClickAwayListener,
  Alert,
} from '@mui/material';
import Toast from '@arcblock/ux/lib/Toast';
import { CustomComponentRenderer } from '@blocklet/pages-kit/components';
import { Icon } from '@blocklet/pages-kit/builtin/iconify/react';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import dayjs from 'dayjs';
import RequiredLogin from './required-login';
import { useSessionContext } from '../contexts/session';
import { getTodos, createTodo, deleteTodo, updateTodo, Todo } from '../libs/todo';
import TodoItem from '../components/todo-item';
import { useSubscription } from '../libs/ws';

const Title = styled(Typography)`
  font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
  font-weight: 400;
  font-size: 1rem;
  line-height: 1.5;
  letter-spacing: 0.00938em;
  width: 100%;
  font-size: 30px;
  font-weight: 700;
  text-align: center;
`;

function TodoList() {
  const [todoList, setTodoList] = useState<Todo[]>([]);
  const [editTaskId, setEditTaskId] = useState('');
  const [loading, setLoading] = useState(true);
  const { session } = useSessionContext();
  const state = usePopupState({ variant: 'popper' });
  const [todo, setTodo] = useState<{ title: string; todoTime: string }>({
    title: '',
    todoTime: dayjs().format('YYYY-MM-DD HH:00'),
  });

  useEffect(() => {
    const fetchTodoList = async () => {
      try {
        setLoading(true);
        const response = await getTodos();
        setTodoList(response.list);
      } catch (error) {
        console.error(error);
        setTodoList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTodoList();
  }, []);

  const handleInputChange = (event: any) => setTodo((r) => ({ ...r, title: event.target.value }));

  const handleAddTask = async () => {
    if (!todo.title.trim()) {
      return;
    }

    try {
      setLoading(true);
      const response = await createTodo({ title: todo.title, todoTime: todo.todoTime });
      setTodoList([...todoList, response.todo]);
      setTodo({ title: '', todoTime: dayjs().format('YYYY-MM-DD HH:00') });
      Toast.success('Task added successfully');
    } catch (error) {
      console.error(error);
      Toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      setTodoList((prevTodoList) => prevTodoList.filter((task) => task.id !== taskId));
      await deleteTodo({ id: taskId });
      Toast.success('Task deleted successfully');
    } catch (error) {
      console.error(error);
      Toast.error(error.message);
    }
  };

  const handleEditTask = (taskId: string) => {
    setEditTaskId(taskId);
    const taskToEdit = todoList.find((task) => task.id === taskId);
    if (taskToEdit)
      setTodo((r) => {
        return {
          ...r,
          title: taskToEdit.title || '',
          todoTime: taskToEdit.todoTime || dayjs().format('YYYY-MM-DD HH:00'),
        };
      });
  };

  const handleUpdateTask = async () => {
    if (!todo.title.trim()) {
      return;
    }

    try {
      await updateTodo(editTaskId, { title: todo.title, todoTime: todo.todoTime });
      setTodoList((prevTodoList) =>
        prevTodoList.map((task) =>
          task.id === editTaskId ? { ...task, title: todo.title, todoTime: todo.todoTime } : task
        )
      );
      setTodo({ title: '', todoTime: dayjs().format('YYYY-MM-DD HH:00') });
      setEditTaskId('');
      Toast.success('Task updated successfully');
    } catch (error) {
      console.error(error);
      Toast.error(error.message);
    }
  };

  useSubscription(
    'todo:add',
    ({ todo: remoteTodo, userId }) => {
      if (userId !== session.user?.did) return;

      const found = todoList.find((x) => x.id === remoteTodo.id);
      if (found) {
        setTodoList((prevTodoList) => prevTodoList.map((task) => (task.id === remoteTodo.id ? remoteTodo : task)));
      } else {
        setTodoList((r) => [...r, remoteTodo]);
      }
    },
    [todoList, session.user?.did]
  );

  useSubscription(
    'todo:update',
    ({ todo: remoteTodo, userId }) => {
      if (userId !== session.user?.did) return;

      const found = todoList.find((x) => x.id === remoteTodo.id);
      if (found) {
        setTodoList((prevTodoList) => prevTodoList.map((task) => (task.id === remoteTodo.id ? remoteTodo : task)));
      }
    },
    [todoList, session.user?.did]
  );

  useSubscription(
    'todo:delete',
    ({ todo: remoteTodo, userId }) => {
      if (userId !== session.user?.did) return;

      setTodoList((prevTodoList) => prevTodoList.filter((task) => task.id !== remoteTodo.id));
    },
    [todoList, session.user?.did]
  );

  if (!session.user) {
    return <RequiredLogin />;
  }

  return (
    <Box px={2}>
      {!!window?.blocklet?.preferences?.runtimeAID && (
        <Alert sx={{ mb: 2 }} severity="warning">
          With AI TODO LIST, you can save data to Blocklet TODO List and use Blocklet TODO components for rendering.
        </Alert>
      )}

      <Grid container justifyContent="center" gap={2}>
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ flex: 1, p: 2, height: 1, minHeight: 500, boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
          <Box>Blocklet TODO LIST</Box>
          <Box display="flex" justifyContent="center">
            <Box maxWidth={540} width={1}>
              <Title textAlign="center" mt={8} mb={4}>
                Todo List
              </Title>

              <Box mb={2} width={1} display="flex" gap={1}>
                <TextField
                  sx={{ flex: 1 }}
                  size="small"
                  type="text"
                  placeholder="Add your todo"
                  autoFocus
                  value={todo.title}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (editTaskId) {
                        handleUpdateTask();
                      } else {
                        handleAddTask();
                      }
                    }
                  }}
                />

                <IconButton {...bindTrigger(state)}>
                  <Box component={Icon} icon="material-symbols:date-range" />
                </IconButton>
                <Popper {...bindPopper(state)}>
                  <ClickAwayListener onClickAway={state.close}>
                    <Box>
                      <Paper>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                          <DemoContainer components={['DateCalendar', 'DateCalendar']}>
                            <DateCalendar
                              value={dayjs(todo.todoTime || '')}
                              onChange={(newValue) => {
                                if (newValue) {
                                  setTodo((r) => ({ ...r, todoTime: dayjs(newValue).format('YYYY-MM-DD HH:mm') }));
                                }

                                state.close();
                              }}
                            />
                          </DemoContainer>
                        </LocalizationProvider>
                      </Paper>
                    </Box>
                  </ClickAwayListener>
                </Popper>

                <Button
                  type="button"
                  variant="contained"
                  color="primary"
                  id="btn"
                  onClick={editTaskId ? handleUpdateTask : handleAddTask}
                  disabled={loading}>
                  {editTaskId ? 'Update' : 'Add'}
                </Button>
              </Box>

              {todoList.map((task) => (
                <React.Fragment key={task.id}>
                  <TodoItem todo={task} requestInfo={false}>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleEditTask(task.id)}
                        aria-label="edit"
                        color="primary"
                        component="span">
                        <Box component={Icon} icon="tabler:pencil" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteTask(task.id)}
                        aria-label="delete"
                        color="secondary"
                        component="span">
                        <Box component={Icon} icon="tabler:trash" />
                      </IconButton>
                    </Box>
                  </TodoItem>
                </React.Fragment>
              ))}
            </Box>
          </Box>
        </Paper>

        {!!window?.blocklet?.preferences?.runtimeAID && (
          <Paper
            elevation={0}
            variant="outlined"
            sx={{ flex: 1, p: 2, height: 1, minHeight: 500, boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
            <Box>AI TODO LIST</Box>

            <CustomComponentRenderer
              componentId="grc9q1cveub6pnl8" // 固定的值，不用修改，实际是 Runtime 组件的 id
              props={{
                aid: window?.blocklet?.preferences?.runtimeAID, // 预览 agent 地址中的 aid 参数
                working: true, // 是否预览状态，为 true 可以直接获取最新的未保存的 agent 数据
              }}
            />
          </Paper>
        )}
      </Grid>
    </Box>
  );
}

export default TodoList;
