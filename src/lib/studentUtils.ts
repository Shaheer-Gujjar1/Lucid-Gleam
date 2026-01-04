import { Student } from "./db";

/**
 * Get a map of student names that have duplicates (same name but different roll numbers)
 * Returns a Set of student IDs that need to show roll numbers
 */
export function getDuplicateNameStudentIds(students: Student[]): Set<string> {
  const nameCount = new Map<string, Student[]>();
  
  // Group students by name
  students.forEach(student => {
    const normalizedName = student.name.toLowerCase().trim();
    if (!nameCount.has(normalizedName)) {
      nameCount.set(normalizedName, []);
    }
    nameCount.get(normalizedName)!.push(student);
  });
  
  // Find IDs of students with duplicate names
  const duplicateIds = new Set<string>();
  nameCount.forEach(studentsWithSameName => {
    if (studentsWithSameName.length > 1) {
      studentsWithSameName.forEach(s => duplicateIds.add(s.id));
    }
  });
  
  return duplicateIds;
}

/**
 * Get display name for a student, including roll number if there are duplicates
 */
export function getStudentDisplayName(
  student: Student,
  duplicateIds: Set<string>
): string {
  if (duplicateIds.has(student.id) && student.rollNumber) {
    return `${student.name} (${student.rollNumber})`;
  }
  return student.name;
}

/**
 * Check if a student with the same name already exists in the class
 * Returns true if duplicate (same name AND same roll number or no roll number)
 */
export function isDuplicateStudent(
  name: string,
  rollNumber: string | undefined,
  classId: string,
  existingStudents: Student[],
  excludeStudentId?: string
): { isDuplicate: boolean; reason: string } {
  const normalizedName = name.toLowerCase().trim();
  const classStudents = existingStudents.filter(s => s.classId === classId);
  
  for (const student of classStudents) {
    // Skip the student being edited
    if (excludeStudentId && student.id === excludeStudentId) continue;
    
    if (student.name.toLowerCase().trim() === normalizedName) {
      // Same name found - check roll numbers
      if (!rollNumber && !student.rollNumber) {
        return {
          isDuplicate: true,
          reason: "A student with the same name already exists. Please add a roll number to differentiate."
        };
      }
      if (rollNumber && student.rollNumber === rollNumber) {
        return {
          isDuplicate: true,
          reason: "A student with the same name and roll number already exists."
        };
      }
    }
  }
  
  return { isDuplicate: false, reason: "" };
}
