import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Student {
  id: string;
  name: string;
  email?: string;
  photo?: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  type: 'assignment' | 'quiz' | 'presentation' | 'project' | 'other';
  description?: string;
  maxScore: number;
  dueDate?: Date;
  createdAt: Date;
}

export interface Grade {
  id: string;
  studentId: string;
  taskId: string;
  score: number;
  feedback?: string;
  gradedAt: Date;
}

interface TeacherDeskDB extends DBSchema {
  students: {
    key: string;
    value: Student;
    indexes: { 'by-name': string };
  };
  tasks: {
    key: string;
    value: Task;
    indexes: { 'by-type': string; 'by-date': Date };
  };
  grades: {
    key: string;
    value: Grade;
    indexes: { 'by-student': string; 'by-task': string };
  };
}

let dbPromise: Promise<IDBPDatabase<TeacherDeskDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<TeacherDeskDB>('teacherdesk-db', 1, {
      upgrade(db) {
        const studentStore = db.createObjectStore('students', { keyPath: 'id' });
        studentStore.createIndex('by-name', 'name');

        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
        taskStore.createIndex('by-type', 'type');
        taskStore.createIndex('by-date', 'createdAt');

        const gradeStore = db.createObjectStore('grades', { keyPath: 'id' });
        gradeStore.createIndex('by-student', 'studentId');
        gradeStore.createIndex('by-task', 'taskId');
      },
    });
  }
  return dbPromise;
}

// Student operations
export async function getAllStudents(): Promise<Student[]> {
  const db = await getDB();
  return db.getAll('students');
}

export async function getStudent(id: string): Promise<Student | undefined> {
  const db = await getDB();
  return db.get('students', id);
}

export async function addStudent(student: Omit<Student, 'id' | 'createdAt'>): Promise<Student> {
  const db = await getDB();
  const newStudent: Student = {
    ...student,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };
  await db.add('students', newStudent);
  return newStudent;
}

export async function updateStudent(student: Student): Promise<Student> {
  const db = await getDB();
  await db.put('students', student);
  return student;
}

export async function deleteStudent(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('students', id);
  // Also delete associated grades
  const grades = await db.getAllFromIndex('grades', 'by-student', id);
  for (const grade of grades) {
    await db.delete('grades', grade.id);
  }
}

// Task operations
export async function getAllTasks(): Promise<Task[]> {
  const db = await getDB();
  return db.getAll('tasks');
}

export async function getTask(id: string): Promise<Task | undefined> {
  const db = await getDB();
  return db.get('tasks', id);
}

export async function addTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  const db = await getDB();
  const newTask: Task = {
    ...task,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };
  await db.add('tasks', newTask);
  return newTask;
}

export async function updateTask(task: Task): Promise<Task> {
  const db = await getDB();
  await db.put('tasks', task);
  return task;
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('tasks', id);
  // Also delete associated grades
  const grades = await db.getAllFromIndex('grades', 'by-task', id);
  for (const grade of grades) {
    await db.delete('grades', grade.id);
  }
}

// Grade operations
export async function getAllGrades(): Promise<Grade[]> {
  const db = await getDB();
  return db.getAll('grades');
}

export async function getGradesByStudent(studentId: string): Promise<Grade[]> {
  const db = await getDB();
  return db.getAllFromIndex('grades', 'by-student', studentId);
}

export async function getGradesByTask(taskId: string): Promise<Grade[]> {
  const db = await getDB();
  return db.getAllFromIndex('grades', 'by-task', taskId);
}

export async function addGrade(grade: Omit<Grade, 'id' | 'gradedAt'>): Promise<Grade> {
  const db = await getDB();
  const newGrade: Grade = {
    ...grade,
    id: crypto.randomUUID(),
    gradedAt: new Date(),
  };
  await db.add('grades', newGrade);
  return newGrade;
}

export async function updateGrade(grade: Grade): Promise<Grade> {
  const db = await getDB();
  await db.put('grades', grade);
  return grade;
}

export async function deleteGrade(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('grades', id);
}

export async function getGradeForStudentTask(studentId: string, taskId: string): Promise<Grade | undefined> {
  const db = await getDB();
  const grades = await db.getAllFromIndex('grades', 'by-student', studentId);
  return grades.find(g => g.taskId === taskId);
}

export async function upsertGrade(studentId: string, taskId: string, score: number, feedback?: string): Promise<Grade> {
  const existing = await getGradeForStudentTask(studentId, taskId);
  if (existing) {
    return updateGrade({ ...existing, score, feedback, gradedAt: new Date() });
  }
  return addGrade({ studentId, taskId, score, feedback });
}
