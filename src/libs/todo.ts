import { joinURL } from 'ufo';
import axios from './api';

export function getComponentMountPoint(name: string) {
  return window.blocklet?.componentMountPoints.find((i) => i.name === name || i.did === name)?.mountPoint || '/';
}

const TODO = 'z2qa8QkeN9aSTWL6ZAq7JHLeVbixrLtgLkTFh';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  updatedAt: string;
  todoTime?: string;
  todoKeyword?: string;
}

export function getTodos(): Promise<{ list: Todo[] }> {
  return axios.get(joinURL(getComponentMountPoint(TODO), '/api/todos')).then((res) => res.data);
}

export function getTodo({ id }: { id: string }): Promise<{ todo: Todo }> {
  return axios.get(joinURL(getComponentMountPoint(TODO), '/api/todos', id)).then((res) => res.data);
}

export function createTodo({ title, todoTime }: { title: string; todoTime: string }): Promise<{ todo: Todo }> {
  return axios.post(joinURL(getComponentMountPoint(TODO), '/api/todos'), { title, todoTime }).then((res) => res.data);
}

export function updateTodo(
  id: string,
  { title, completed, todoTime }: { title?: string; completed?: boolean; todoTime?: string }
): Promise<{ todo: Todo }> {
  return axios
    .put(joinURL(getComponentMountPoint(TODO), '/api/todos', id), { title, completed, todoTime })
    .then((res) => res.data);
}

export function deleteTodo({ id }: { id: string }): Promise<{ todo: Todo }> {
  return axios.delete(joinURL(getComponentMountPoint(TODO), '/api/todos', id)).then((res) => res.data);
}
