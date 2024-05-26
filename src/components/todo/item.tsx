import { Todo } from '../../libs/todo';
import TodoItem from '../todo-item';

function Item({ remoteOutputValue }: { remoteOutputValue: Todo }) {
  return <TodoItem todo={remoteOutputValue} requestInfo={false} />;
}

export default Item;
