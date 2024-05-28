import { useState, useEffect } from 'react';
import { CSSTransition } from 'react-transition-group';
import Toast from '@arcblock/ux/lib/Toast';
import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { Todo, getTodo, updateTodo } from '../libs/todo';

interface TodoComp {
  children?: any;
  todo: Todo;
  requestInfo?: boolean;
}

function TodoItem({ todo, children, requestInfo }: TodoComp) {
  const [task, setTask] = useState(todo);

  useEffect(() => {
    const fetchData = async () => {
      if (!requestInfo) return;

      try {
        const result = await getTodo({ id: todo?.id });
        setTask((r) => ({ ...r, completed: result.todo.completed, todoTime: result.todo.todoTime }));
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, [todo?.id, requestInfo]);

  const handleCheckboxChange = async () => {
    try {
      setTask((r) => ({ ...r, completed: !r.completed }));
      await updateTodo(todo?.id, { completed: !task.completed });
      Toast.success('Task updated successfully');
    } catch (error) {
      console.error(error);
      Toast.error(error.message);
    }
  };

  useEffect(() => {
    setTask(todo);
  }, [todo]);

  return (
    <CSSTransition classNames="fade" timeout={300}>
      <Box display="flex" gap={1}>
        <Box flex={1}>
          <Box display="flex" alignItems="center">
            <FormControlLabel
              control={<Checkbox checked={task.completed} onChange={handleCheckboxChange} />}
              label={task.title}
            />

            {task?.todoTime && (
              <Typography
                sx={{
                  fontSize: '12px',
                  lineHeight: '20px',
                  fontWeight: 400,
                  color: '#9CA3AF',
                }}>
                {dayjs(task.todoTime).format('YYYY-MM-DD HH:mm')}
              </Typography>
            )}
          </Box>
        </Box>
        {children}
      </Box>
    </CSSTransition>
  );
}

export default TodoItem;
