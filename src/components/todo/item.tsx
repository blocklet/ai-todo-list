import { Todo } from '../../libs/todo';
import TodoItem from '../todo-item';

function Item({ outputValue }: { outputValue: Todo }) {
  if (!outputValue?.id) {
    return null;
  }

  return <TodoItem todo={outputValue} requestInfo={false} />;
}

export default Item;
