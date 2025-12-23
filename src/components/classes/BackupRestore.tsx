import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { 
  getAllInstitutes, getAllClasses, getAllStudents, getAllTasks, getAllGrades,
  addInstitute, addClass, addStudent, addTask, addGrade,
  Institute, Class, Student, Task, Grade
} from "@/lib/db";
import { Download, Upload, FileJson, Database, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface BackupData {
  version: string;
  exportedAt: string;
  institutes: Institute[];
  classes: Class[];
  students: Student[];
  tasks: Task[];
  grades: Grade[];
}

export function BackupRestore() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);
  const [importStats, setImportStats] = useState<{
    institutes: number;
    classes: number;
    students: number;
    tasks: number;
    grades: number;
  } | null>(null);

  const exportBackup = async () => {
    setIsExporting(true);
    try {
      const [institutes, classes, students, tasks, grades] = await Promise.all([
        getAllInstitutes(),
        getAllClasses(),
        getAllStudents(),
        getAllTasks(),
        getAllGrades(),
      ]);

      const backupData: BackupData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        institutes,
        classes,
        students,
        tasks,
        grades,
      };

      const json = JSON.stringify(backupData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `teacherdesk_backup_${format(new Date(), "yyyy-MM-dd_HHmm")}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Backup exported successfully!");
    } catch (error) {
      toast.error("Failed to export backup");
      console.error(error);
    }
    setIsExporting(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as BackupData;
        
        // Validate backup structure
        if (!data.version || !data.institutes || !data.classes || !data.students || !data.tasks || !data.grades) {
          toast.error("Invalid backup file format");
          return;
        }

        setPendingBackup(data);
        setShowRestoreDialog(true);
      } catch (error) {
        toast.error("Failed to parse backup file");
      }
    };
    reader.readAsText(file);
  };

  const restoreBackup = async () => {
    if (!pendingBackup) return;

    setIsImporting(true);
    setShowRestoreDialog(false);

    const stats = { institutes: 0, classes: 0, students: 0, tasks: 0, grades: 0 };
    const idMap = new Map<string, string>();

    try {
      // Import institutes
      for (const institute of pendingBackup.institutes) {
        const newInstitute = await addInstitute({ name: institute.name, address: institute.address });
        idMap.set(institute.id, newInstitute.id);
        stats.institutes++;
      }

      // Import classes with updated institute IDs
      for (const cls of pendingBackup.classes) {
        const newInstituteId = idMap.get(cls.instituteId);
        if (newInstituteId) {
          const newClass = await addClass({ 
            instituteId: newInstituteId, 
            name: cls.name, 
            subject: cls.subject 
          });
          idMap.set(cls.id, newClass.id);
          stats.classes++;
        }
      }

      // Import students with updated class IDs
      for (const student of pendingBackup.students) {
        const newClassId = idMap.get(student.classId);
        if (newClassId) {
          const newStudent = await addStudent({
            classId: newClassId,
            name: student.name,
            email: student.email,
            photo: student.photo,
          });
          idMap.set(student.id, newStudent.id);
          stats.students++;
        }
      }

      // Import tasks with updated class IDs
      for (const task of pendingBackup.tasks) {
        const newClassId = idMap.get(task.classId);
        if (newClassId) {
          const newTask = await addTask({
            classId: newClassId,
            title: task.title,
            type: task.type,
            description: task.description,
            maxScore: task.maxScore,
            dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
          });
          idMap.set(task.id, newTask.id);
          stats.tasks++;
        }
      }

      // Import grades with updated student and task IDs
      for (const grade of pendingBackup.grades) {
        const newStudentId = idMap.get(grade.studentId);
        const newTaskId = idMap.get(grade.taskId);
        if (newStudentId && newTaskId) {
          await addGrade({
            studentId: newStudentId,
            taskId: newTaskId,
            score: grade.score,
            feedback: grade.feedback,
          });
          stats.grades++;
        }
      }

      setImportStats(stats);
      toast.success("Backup restored successfully!");
    } catch (error) {
      toast.error("Failed to restore backup");
      console.error(error);
    }

    setIsImporting(false);
    setPendingBackup(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Download className="h-5 w-5" />
              Export Backup
            </CardTitle>
            <CardDescription>
              Download all your data as a JSON file that can be restored later
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-background">
              <FileJson className="h-10 w-10 text-primary" />
              <div>
                <p className="font-medium text-foreground">Complete Backup</p>
                <p className="text-sm text-muted-foreground">
                  Includes all institutes, classes, students, tasks, and grades
                </p>
              </div>
            </div>
            <Button onClick={exportBackup} disabled={isExporting} className="w-full gap-2">
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download Backup
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Upload className="h-5 w-5" />
              Restore Backup
            </CardTitle>
            <CardDescription>
              Import data from a previously exported JSON backup file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-background">
              <Database className="h-10 w-10 text-chart-2" />
              <div>
                <p className="font-medium text-foreground">Import Data</p>
                <p className="text-sm text-muted-foreground">
                  Data will be added to your existing records
                </p>
              </div>
            </div>
            <div>
              <Label htmlFor="backup-file">Select Backup File</Label>
              <Input
                id="backup-file"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                disabled={isImporting}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {importStats && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-chart-1">
              <CheckCircle className="h-5 w-5" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="text-center p-4 rounded-lg bg-background">
                <div className="text-2xl font-bold text-foreground">{importStats.institutes}</div>
                <div className="text-sm text-muted-foreground">Institutes</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-background">
                <div className="text-2xl font-bold text-foreground">{importStats.classes}</div>
                <div className="text-sm text-muted-foreground">Classes</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-background">
                <div className="text-2xl font-bold text-foreground">{importStats.students}</div>
                <div className="text-sm text-muted-foreground">Students</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-background">
                <div className="text-2xl font-bold text-foreground">{importStats.tasks}</div>
                <div className="text-sm text-muted-foreground">Tasks</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-background">
                <div className="text-2xl font-bold text-foreground">{importStats.grades}</div>
                <div className="text-sm text-muted-foreground">Grades</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-chart-4" />
              Restore Backup?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will import the following data into your app. Existing data will NOT be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {pendingBackup && (
            <div className="grid grid-cols-3 gap-2 py-4">
              <Badge variant="secondary" className="justify-center py-2">
                {pendingBackup.institutes.length} Institutes
              </Badge>
              <Badge variant="secondary" className="justify-center py-2">
                {pendingBackup.classes.length} Classes
              </Badge>
              <Badge variant="secondary" className="justify-center py-2">
                {pendingBackup.students.length} Students
              </Badge>
              <Badge variant="secondary" className="justify-center py-2">
                {pendingBackup.tasks.length} Tasks
              </Badge>
              <Badge variant="secondary" className="justify-center py-2">
                {pendingBackup.grades.length} Grades
              </Badge>
              <Badge variant="outline" className="justify-center py-2">
                {format(new Date(pendingBackup.exportedAt), "MMM d, yyyy")}
              </Badge>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={restoreBackup}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}