import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Upload,
  FileText,
  Image,
  File,
  Trash2,
  Download,
  Eye,
  Save,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  Task,
  Student,
  Grade,
  TaskFile,
  getFilesByTask,
  addTaskFile,
  deleteTaskFile,
  getStudentsByClass,
  getGradesByTask,
  upsertGrade,
} from "@/lib/db";

interface TaskDetailProps {
  task: Task;
  classId: string;
  onBack: () => void;
  onDataChange?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return Image;
  if (type === "application/pdf") return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function TaskDetail({ task, classId, onBack, onDataChange }: TaskDetailProps) {
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Record<string, { score: string; saved: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<TaskFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [task.id, classId]);

  async function loadData() {
    setLoading(true);
    const [taskFiles, classStudents, taskGrades] = await Promise.all([
      getFilesByTask(task.id),
      getStudentsByClass(classId),
      getGradesByTask(task.id),
    ]);
    
    setFiles(taskFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setStudents(classStudents.sort((a, b) => a.name.localeCompare(b.name)));
    
    const gradeMap: Record<string, { score: string; saved: boolean }> = {};
    classStudents.forEach(student => {
      const grade = taskGrades.find(g => g.studentId === student.id);
      gradeMap[student.id] = {
        score: grade ? grade.score.toString() : "",
        saved: !!grade,
      };
    });
    setGrades(gradeMap);
    setLoading(false);
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const file of Array.from(selectedFiles)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Max size is 10MB.`);
        continue;
      }

      if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
        toast.error(`${file.name} has an unsupported file type.`);
        continue;
      }

      try {
        await addTaskFile({
          taskId: task.id,
          name: file.name,
          type: file.type,
          size: file.size,
          data: file,
        });
        successCount++;
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded successfully`);
      loadData();
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async () => {
    if (deleteFileId) {
      await deleteTaskFile(deleteFileId);
      toast.success("File deleted");
      setDeleteFileId(null);
      loadData();
    }
  };

  const handleDownload = (file: TaskFile) => {
    const url = URL.createObjectURL(file.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePreview = (file: TaskFile) => {
    if (file.type.startsWith("image/") || file.type === "application/pdf") {
      setPreviewFile(file);
    } else {
      handleDownload(file);
    }
  };

  const handleScoreChange = (studentId: string, value: string) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: { score: value, saved: false },
    }));
  };

  const handleSaveGrade = async (studentId: string) => {
    const entry = grades[studentId];
    const score = parseFloat(entry.score);
    
    if (entry.score === "" || isNaN(score) || score < 0 || score > task.maxScore) {
      toast.error(`Score must be between 0 and ${task.maxScore}`);
      return;
    }

    setSaving(prev => ({ ...prev, [studentId]: true }));

    try {
      await upsertGrade(studentId, task.id, score);
      setGrades(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], saved: true },
      }));
      toast.success("Grade saved");
      onDataChange?.();
    } catch (error) {
      toast.error("Failed to save grade");
    } finally {
      setSaving(prev => ({ ...prev, [studentId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
            <Badge variant="outline" className="capitalize">{task.type}</Badge>
            <Badge>{task.maxScore} pts</Badge>
          </div>
          {task.description && (
            <p className="mt-1 text-muted-foreground">{task.description}</p>
          )}
          {task.dueDate && (
            <p className="text-sm text-muted-foreground">
              Due: {new Date(task.dueDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Files Section */}
        <Card className="border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-card-foreground">Reference Files</CardTitle>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ALLOWED_TYPES.join(",")}
                onChange={handleFileSelect}
                className="hidden"
                id="task-file-upload"
              />
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No files uploaded yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload question papers, rubrics, answer keys, etc.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {files.map((file) => {
                  const FileIcon = getFileIcon(file.type);
                  return (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 rounded-lg bg-background p-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <FileIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePreview(file)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(file)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteFileId(file.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grades Section */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-card-foreground">Student Grades</CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-muted-foreground">No students in this class</p>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead className="w-[120px] text-center">
                        Score / {task.maxScore}
                      </TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const entry = grades[student.id] || { score: "", saved: false };
                      const isSaving = saving[student.id];
                      return (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {student.photo ? (
                                <img
                                  src={student.photo}
                                  alt={student.name}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                                  {student.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="font-medium">{student.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max={task.maxScore}
                              value={entry.score}
                              onChange={(e) => handleScoreChange(student.id, e.target.value)}
                              className="w-20 text-center mx-auto"
                              placeholder="-"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant={entry.saved ? "ghost" : "default"}
                              className="h-8 w-8"
                              onClick={() => handleSaveGrade(student.id)}
                              disabled={isSaving || !entry.score}
                            >
                              {entry.saved ? (
                                <Check className="h-4 w-4 text-primary" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="truncate pr-4">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewFile?.type.startsWith("image/") && (
              <img
                src={URL.createObjectURL(previewFile.data)}
                alt={previewFile.name}
                className="max-w-full h-auto rounded-lg"
              />
            )}
            {previewFile?.type === "application/pdf" && (
              <iframe
                src={URL.createObjectURL(previewFile.data)}
                className="w-full h-[70vh] rounded-lg"
                title={previewFile.name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete File Confirmation */}
      <AlertDialog open={!!deleteFileId} onOpenChange={() => setDeleteFileId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}