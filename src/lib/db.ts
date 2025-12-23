import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Institute {
  id: string;
  name: string;
  address?: string;
  createdAt: Date;
}

export interface Class {
  id: string;
  instituteId: string;
  name: string;
  subject?: string;
  createdAt: Date;
}

export interface Student {
  id: string;
  classId: string;
  name: string;
  email?: string;
  photo?: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  classId: string;
  title: string;
  type: 'assignment' | 'quiz' | 'presentation' | 'project' | 'other';
  description?: string;
  maxScore: number;
  dueDate?: Date;
  createdAt: Date;
}

export interface TaskFile {
  id: string;
  taskId: string;
  studentId?: string; // Optional: link file to a specific student
  name: string;
  type: string;
  size: number;
  data: Blob;
  score?: number; // Optional: grade for this file
  feedback?: string;
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

export interface Attendance {
  id: string;
  classId: string;
  studentId: string;
  date: string; // YYYY-MM-DD format
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  createdAt: Date;
}

export interface TeacherFile {
  id: string;
  classId: string;
  name: string;
  type: string;
  size: number;
  data: Blob;
  description?: string;
  createdAt: Date;
}

interface TeacherDeskDB extends DBSchema {
  institutes: {
    key: string;
    value: Institute;
    indexes: { 'by-name': string };
  };
  classes: {
    key: string;
    value: Class;
    indexes: { 'by-institute': string; 'by-name': string };
  };
  students: {
    key: string;
    value: Student;
    indexes: { 'by-name': string; 'by-class': string };
  };
  tasks: {
    key: string;
    value: Task;
    indexes: { 'by-type': string; 'by-date': Date; 'by-class': string };
  };
  grades: {
    key: string;
    value: Grade;
    indexes: { 'by-student': string; 'by-task': string };
  };
  taskFiles: {
    key: string;
    value: TaskFile;
    indexes: { 'by-task': string; 'by-student': string };
  };
  attendance: {
    key: string;
    value: Attendance;
    indexes: { 'by-class': string; 'by-student': string; 'by-date': string };
  };
  teacherFiles: {
    key: string;
    value: TeacherFile;
    indexes: { 'by-class': string };
  };
}

let dbPromise: Promise<IDBPDatabase<TeacherDeskDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<TeacherDeskDB>('teacherdesk-db', 5, {
      upgrade(db, oldVersion) {
        // Create institutes store
        if (!db.objectStoreNames.contains('institutes')) {
          const instituteStore = db.createObjectStore('institutes', { keyPath: 'id' });
          instituteStore.createIndex('by-name', 'name');
        }

        // Create classes store
        if (!db.objectStoreNames.contains('classes')) {
          const classStore = db.createObjectStore('classes', { keyPath: 'id' });
          classStore.createIndex('by-institute', 'instituteId');
          classStore.createIndex('by-name', 'name');
        }

        // Handle students store
        if (!db.objectStoreNames.contains('students')) {
          const studentStore = db.createObjectStore('students', { keyPath: 'id' });
          studentStore.createIndex('by-name', 'name');
          studentStore.createIndex('by-class', 'classId');
        } else if (oldVersion < 2) {
          const tx = db.transaction as any;
          if (tx && tx.objectStore) {
            const studentStore = tx.objectStore('students');
            if (!studentStore.indexNames.contains('by-class')) {
              studentStore.createIndex('by-class', 'classId');
            }
          }
        }

        // Handle tasks store
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('by-type', 'type');
          taskStore.createIndex('by-date', 'createdAt');
          taskStore.createIndex('by-class', 'classId');
        } else if (oldVersion < 2) {
          const tx = db.transaction as any;
          if (tx && tx.objectStore) {
            const taskStore = tx.objectStore('tasks');
            if (!taskStore.indexNames.contains('by-class')) {
              taskStore.createIndex('by-class', 'classId');
            }
          }
        }

        // Handle grades store
        if (!db.objectStoreNames.contains('grades')) {
          const gradeStore = db.createObjectStore('grades', { keyPath: 'id' });
          gradeStore.createIndex('by-student', 'studentId');
          gradeStore.createIndex('by-task', 'taskId');
        }

        // Handle taskFiles store
        if (!db.objectStoreNames.contains('taskFiles')) {
          const taskFilesStore = db.createObjectStore('taskFiles', { keyPath: 'id' });
          taskFilesStore.createIndex('by-task', 'taskId');
          taskFilesStore.createIndex('by-student', 'studentId');
        } else if (oldVersion < 5) {
          // Add student index to existing taskFiles store
          const tx = db.transaction as any;
          if (tx && tx.objectStore) {
            const taskFilesStore = tx.objectStore('taskFiles');
            if (!taskFilesStore.indexNames.contains('by-student')) {
              taskFilesStore.createIndex('by-student', 'studentId');
            }
          }
        }

        // Handle attendance store (new in version 4)
        if (!db.objectStoreNames.contains('attendance')) {
          const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id' });
          attendanceStore.createIndex('by-class', 'classId');
          attendanceStore.createIndex('by-student', 'studentId');
          attendanceStore.createIndex('by-date', 'date');
        }

        // Handle teacherFiles store (new in version 4)
        if (!db.objectStoreNames.contains('teacherFiles')) {
          const teacherFilesStore = db.createObjectStore('teacherFiles', { keyPath: 'id' });
          teacherFilesStore.createIndex('by-class', 'classId');
        }
      },
    });
  }
  return dbPromise;
}

// Institute operations
export async function getAllInstitutes(): Promise<Institute[]> {
  const db = await getDB();
  return db.getAll('institutes');
}

export async function getInstitute(id: string): Promise<Institute | undefined> {
  const db = await getDB();
  return db.get('institutes', id);
}

export async function addInstitute(institute: Omit<Institute, 'id' | 'createdAt'>): Promise<Institute> {
  const db = await getDB();
  const newInstitute: Institute = {
    ...institute,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };
  await db.add('institutes', newInstitute);
  return newInstitute;
}

export async function updateInstitute(institute: Institute): Promise<Institute> {
  const db = await getDB();
  await db.put('institutes', institute);
  return institute;
}

export async function deleteInstitute(id: string): Promise<void> {
  const db = await getDB();
  // Delete all classes in this institute (which will cascade to students, tasks, grades)
  const classes = await db.getAllFromIndex('classes', 'by-institute', id);
  for (const cls of classes) {
    await deleteClass(cls.id);
  }
  await db.delete('institutes', id);
}

// Class operations
export async function getAllClasses(): Promise<Class[]> {
  const db = await getDB();
  return db.getAll('classes');
}

export async function getClassesByInstitute(instituteId: string): Promise<Class[]> {
  const db = await getDB();
  return db.getAllFromIndex('classes', 'by-institute', instituteId);
}

export async function getClass(id: string): Promise<Class | undefined> {
  const db = await getDB();
  return db.get('classes', id);
}

export async function addClass(classData: Omit<Class, 'id' | 'createdAt'>): Promise<Class> {
  const db = await getDB();
  const newClass: Class = {
    ...classData,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };
  await db.add('classes', newClass);
  return newClass;
}

export async function updateClass(classData: Class): Promise<Class> {
  const db = await getDB();
  await db.put('classes', classData);
  return classData;
}

export async function deleteClass(id: string): Promise<void> {
  const db = await getDB();
  // Delete all students and tasks in this class
  const students = await getStudentsByClass(id);
  for (const student of students) {
    await deleteStudent(student.id);
  }
  const tasks = await getTasksByClass(id);
  for (const task of tasks) {
    await deleteTask(task.id);
  }
  await db.delete('classes', id);
}

// Student operations
export async function getAllStudents(): Promise<Student[]> {
  const db = await getDB();
  return db.getAll('students');
}

export async function getStudentsByClass(classId: string): Promise<Student[]> {
  const db = await getDB();
  return db.getAllFromIndex('students', 'by-class', classId);
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

export async function getTasksByClass(classId: string): Promise<Task[]> {
  const db = await getDB();
  return db.getAllFromIndex('tasks', 'by-class', classId);
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
  const grades = await db.getAllFromIndex('grades', 'by-task', id);
  for (const grade of grades) {
    await db.delete('grades', grade.id);
  }
  // Also delete associated files
  const files = await db.getAllFromIndex('taskFiles', 'by-task', id);
  for (const file of files) {
    await db.delete('taskFiles', file.id);
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

// TaskFile operations
export async function getFilesByTask(taskId: string): Promise<TaskFile[]> {
  const db = await getDB();
  return db.getAllFromIndex('taskFiles', 'by-task', taskId);
}

export async function addTaskFile(file: Omit<TaskFile, 'id' | 'createdAt'>): Promise<TaskFile> {
  const db = await getDB();
  const newFile: TaskFile = {
    ...file,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };
  await db.add('taskFiles', newFile);
  return newFile;
}

export async function deleteTaskFile(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('taskFiles', id);
}

export async function updateTaskFile(file: TaskFile): Promise<TaskFile> {
  const db = await getDB();
  await db.put('taskFiles', file);
  return file;
}

export async function getTaskFile(id: string): Promise<TaskFile | undefined> {
  const db = await getDB();
  return db.get('taskFiles', id);
}

// Attendance operations
export async function getAttendanceByClass(classId: string): Promise<Attendance[]> {
  const db = await getDB();
  return db.getAllFromIndex('attendance', 'by-class', classId);
}

export async function getAttendanceByDate(classId: string, date: string): Promise<Attendance[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('attendance', 'by-class', classId);
  return all.filter(a => a.date === date);
}

export async function upsertAttendance(
  classId: string,
  studentId: string,
  date: string,
  status: Attendance['status'],
  notes?: string
): Promise<Attendance> {
  const db = await getDB();
  const existing = (await db.getAllFromIndex('attendance', 'by-class', classId))
    .find(a => a.studentId === studentId && a.date === date);
  
  if (existing) {
    const updated = { ...existing, status, notes };
    await db.put('attendance', updated);
    return updated;
  }
  
  const newRecord: Attendance = {
    id: crypto.randomUUID(),
    classId,
    studentId,
    date,
    status,
    notes,
    createdAt: new Date(),
  };
  await db.add('attendance', newRecord);
  return newRecord;
}

export async function deleteAttendanceByClass(classId: string): Promise<void> {
  const db = await getDB();
  const records = await db.getAllFromIndex('attendance', 'by-class', classId);
  for (const record of records) {
    await db.delete('attendance', record.id);
  }
}

// TeacherFile operations
export async function getTeacherFilesByClass(classId: string): Promise<TeacherFile[]> {
  const db = await getDB();
  return db.getAllFromIndex('teacherFiles', 'by-class', classId);
}

export async function addTeacherFile(file: Omit<TeacherFile, 'id' | 'createdAt'>): Promise<TeacherFile> {
  const db = await getDB();
  const newFile: TeacherFile = {
    ...file,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };
  await db.add('teacherFiles', newFile);
  return newFile;
}

export async function deleteTeacherFile(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('teacherFiles', id);
}

export async function getTeacherFile(id: string): Promise<TeacherFile | undefined> {
  const db = await getDB();
  return db.get('teacherFiles', id);
}

export async function deleteTeacherFilesByClass(classId: string): Promise<void> {
  const db = await getDB();
  const files = await db.getAllFromIndex('teacherFiles', 'by-class', classId);
  for (const file of files) {
    await db.delete('teacherFiles', file.id);
  }
}
