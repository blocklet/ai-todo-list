import { useState, useEffect } from 'react';
import { CSSTransition } from 'react-transition-group';
import Toast from '@arcblock/ux/lib/Toast';
import { Box, Checkbox, FormControlLabel } from '@mui/material';
import { Todo, getTodo, updateTodo } from '../libs/todo';

interface TodoComp {
  children?: any;
  todo: Todo;
  requestInfo?: boolean;
}

function TodoItem({ todo, children, requestInfo }: TodoComp) {
  const { id, title } = todo;
  const [completed, setCompleted] = useState(todo.completed);

  useEffect(() => {
    const fetchData = async () => {
      if (!requestInfo) return;

      try {
        const result = await getTodo({ id });
        setCompleted(result.todo.completed);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, [id, requestInfo]);

  const handleCheckboxChange = async () => {
    try {
      setCompleted((prevCompleted) => !prevCompleted);
      await updateTodo(id, { completed: !completed });
      Toast.success('Task updated successfully');
    } catch (error) {
      console.error(error);
      Toast.error(error.message);
    }
  };

  return (
    <CSSTransition classNames="fade" timeout={300}>
      <Box display="flex" gap={1}>
        <Box flex={1}>
          <FormControlLabel control={<Checkbox checked={completed} onChange={handleCheckboxChange} />} label={title} />
        </Box>
        {children}
      </Box>
    </CSSTransition>
  );
}

export default TodoItem;
