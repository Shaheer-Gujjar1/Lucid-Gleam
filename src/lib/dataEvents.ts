// Simple event system for data changes to trigger UI updates

type DataEventType = 'institute' | 'class' | 'student' | 'task' | 'grade' | 'attendance' | 'file';
type DataEventAction = 'add' | 'update' | 'delete';

interface DataEvent {
  type: DataEventType;
  action: DataEventAction;
  id?: string;
}

type DataEventListener = (event: DataEvent) => void;

const listeners: Set<DataEventListener> = new Set();

export function subscribeToDataChanges(listener: DataEventListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitDataChange(type: DataEventType, action: DataEventAction, id?: string): void {
  const event: DataEvent = { type, action, id };
  listeners.forEach(listener => listener(event));
}
