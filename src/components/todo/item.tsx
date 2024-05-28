import { Box, Typography } from '@mui/material';
import { Todo } from '../../libs/todo';
import TodoItem from '../todo-item';

function Item({ outputValue }: { outputValue: Todo }) {
  if (outputValue?.id === undefined) {
    return null;
  }

  return (
    <Box>
      <Typography sx={{ fontSize: '12px', lineHeight: '20px', fontWeight: 400, color: '#9CA3AF' }}>
        The current output is provided by the Blocklet TODO LIST component. 😊😊
      </Typography>

      <TodoItem todo={outputValue} requestInfo={false} />
    </Box>
  );
}

export default Item;
