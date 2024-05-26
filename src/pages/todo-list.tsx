import React, { useState, useEffect } from 'react';
import { Grid, Typography, TextField, Button, IconButton, Box } from '@mui/material';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
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
      <Grid item xs={12} sm={8}>
        <Box maxWidth={540}>
          <Typography variant="h5" textAlign="center">
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
      </Grid>
    </Grid>
  );
}

export default TodoList;
