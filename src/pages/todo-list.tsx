import React, { useState, useEffect } from 'react';
import { Grid, Typography, TextField, Button, IconButton, Box, Paper } from '@mui/material';
import Toast from '@arcblock/ux/lib/Toast';
import { CustomComponentRenderer } from '@blocklet/pages-kit/components';
import { Icon } from '@blocklet/pages-kit/builtin/iconify/react';
import RequiredLogin from './required-login';
import { useSessionContext } from '../contexts/session';
import { getTodos, createTodo, deleteTodo, updateTodo, Todo } from '../libs/todo';
import TodoItem from '../components/todo-item';
import { useSubscription } from '../libs/ws';

function TodoList() {
  const [todoList, setTodoList] = useState<Todo[]>([]);
  const [todoTitle, setTodoTitle] = useState('');
  const [editTaskId, setEditTaskId] = useState('');
  const [loading, setLoading] = useState(true);
  const { session } = useSessionContext();

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

  const handleInputChange = (event: any) => setTodoTitle(event.target.value);

  const handleAddTask = async () => {
    if (!todoTitle.trim()) {
      return;
    }

    try {
      setLoading(true);
      const response = await createTodo({ title: todoTitle });
      setTodoList([...todoList, response.todo]);
      setTodoTitle('');
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
    if (taskToEdit) setTodoTitle(taskToEdit.title);
  };

  const handleUpdateTask = async () => {
    if (!todoTitle.trim()) {
      return;
    }

    try {
      await updateTodo(editTaskId, { title: todoTitle });
      setTodoList((prevTodoList) =>
        prevTodoList.map((task) => (task.id === editTaskId ? { ...task, title: todoTitle } : task))
      );
      setTodoTitle('');
      setEditTaskId('');
      Toast.success('Task updated successfully');
    } catch (error) {
      console.error(error);
      Toast.error(error.message);
    }
  };

  useSubscription(
    'todo:add',
    ({ todo }) => {
      const found = todoList.find((x) => x.id === todo.id);
      if (found) {
        setTodoList((prevTodoList) => prevTodoList.map((task) => (task.id === todo.id ? todo : task)));
      } else {
        setTodoList((r) => [...r, todo]);
      }
    },
    [todoList]
  );

  useSubscription(
    'todo:update',
    ({ todo }) => {
      const found = todoList.find((x) => x.id === todo.id);
      if (found) {
        setTodoList((prevTodoList) => prevTodoList.map((task) => (task.id === todo.id ? todo : task)));
      }
    },
    [todoList]
  );

  useSubscription(
    'todo:delete',
    ({ todo }) => {
      setTodoList((prevTodoList) => prevTodoList.filter((task) => task.id !== todo.id));
    },
    [todoList]
  );

  if (!session.user) {
    return <RequiredLogin />;
  }

  return (
    <Grid container justifyContent="center">
      <Box flex={2} display="flex" justifyContent="center">
        <Box maxWidth={540} width={1}>
          <Typography variant="h5" textAlign="center" mb={2}>
            Todo List
          </Typography>
          <Box mb={2} width={1} display="flex" gap={1}>
            <TextField
              sx={{ flex: 1 }}
              size="small"
              type="text"
              placeholder="Add your todo"
              autoFocus
              value={todoTitle}
              onChange={handleInputChange}
            />

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

      {!!window?.blocklet?.preferences?.runtimeAID && (
        <Paper
          elevation={0}
          variant="outlined"
          sx={{ flex: 1, p: 2, mr: 2, height: 1, minHeight: 500, boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
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
  );
}

export default TodoList;
