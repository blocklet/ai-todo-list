import React from 'react';
import { TransitionGroup } from 'react-transition-group';
import { motion } from 'framer-motion';
import { Box, Typography } from '@mui/material';
import TodoItem from '../todo-item';
import { Todo } from '../../libs/todo';

function TodoList({ outputValue }: { outputValue: Todo[] }) {
  if (outputValue === undefined) {
    return null;
  }

  if (!outputValue?.length) {
    return (
      <Box>
        <Typography sx={{ fontSize: '12px', lineHeight: '20px', fontWeight: 400, color: '#9CA3AF' }}>
          The current output is provided by the Blocklet TODO LIST component. 😊😊
        </Typography>

        <Box>No task, Please add todo first.</Box>
      </Box>
    );
  }

  return (
    <Box>
      <Typography sx={{ fontSize: '12px', lineHeight: '20px', fontWeight: 400, color: '#9CA3AF' }}>
        The current output is provided by the Blocklet TODO LIST component. 😊😊
      </Typography>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <TransitionGroup>
          {(outputValue || []).map((task) => (
            <React.Fragment key={task.id}>
              <TodoItem todo={task} requestInfo />
            </React.Fragment>
          ))}
        </TransitionGroup>
      </motion.div>
    </Box>
  );
}

export default TodoList;
