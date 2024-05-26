import React from 'react';
import { TransitionGroup } from 'react-transition-group';
import { motion } from 'framer-motion';
import TodoItem from '../todo-item';
import { Todo } from '../../libs/todo';

function TodoList({ outputValue }: { outputValue: Todo[] }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <TransitionGroup>
        {(outputValue || []).map((task) => (
          <React.Fragment key={task.id}>
            <TodoItem todo={task} requestInfo />
          </React.Fragment>
        ))}
      </TransitionGroup>
    </motion.div>
  );
}

export default TodoList;
