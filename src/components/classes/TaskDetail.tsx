import { useEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  User,
  Search,
  ClipboardList,
  Paperclip,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  Task,
  Student,
  TaskFile,
  Grade,
  getFilesByTask,
  addTaskFile,
  deleteTaskFile,
  updateTaskFile,
  getStudentsByClass,
  getGradesByTask,
  upsertGrade,
  deleteGrade,
} from "@/lib/db";
import { getDuplicateNameStudentIds, getStudentDisplayName } from "@/lib/studentUtils";

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
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<TaskFile | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [editScore, setEditScore] = useState("");
  const [activeTab, setActiveTab] = useState<"grading" | "files">("grading");
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
    setGrades(taskGrades);
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
      onDataChange?.();
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
      onDataChange?.();
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

  const handleSelectStudent = async (fileId: string, studentId: string | null) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    setSaving(prev => ({ ...prev, [fileId]: true }));

    try {
      await updateTaskFile({
        ...file,
        studentId: studentId || undefined,
      });
      toast.success(studentId ? "Student tagged" : "Student untagged");
      setEditingFileId(null);
      setSearchQuery("");
      loadData();
      onDataChange?.();
    } catch (error) {
      toast.error("Failed to update");
    } finally {
      setSaving(prev => ({ ...prev, [fileId]: false }));
    }
  };

  const handleSaveScore = async (file: TaskFile, scoreValue: string) => {
    const score = scoreValue ? parseFloat(scoreValue) : undefined;
    if (scoreValue && task.maxScore && (isNaN(score!) || score! < 0 || score! > task.maxScore)) {
      toast.error(`Score must be between 0 and ${task.maxScore}`);
      return;
    }

    setSaving(prev => ({ ...prev, [file.id]: true }));

    try {
      await updateTaskFile({
        ...file,
        score,
      });
      toast.success("Score saved");
      loadData();
      onDataChange?.();
    } catch (error) {
      toast.error("Failed to save score");
    } finally {
      setSaving(prev => ({ ...prev, [file.id]: false }));
    }
  };

  // Get duplicate name student IDs
  const duplicateNameIds = useMemo(() => getDuplicateNameStudentIds(students), [students]);

  const getStudentName = (studentId?: string) => {
    if (!studentId) return null;
    const student = students.find(s => s.id === studentId);
    if (!student) return null;
    return getStudentDisplayName(student, duplicateNameIds);
  };

  const getStudentGrade = (studentId: string) => {
    return grades.find(g => g.studentId === studentId);
  };

  const handleManualGrade = async (studentId: string, scoreValue: string) => {
    const score = scoreValue ? parseFloat(scoreValue) : undefined;
    if (scoreValue && (score === undefined || isNaN(score) || score < 0 || score > task.maxScore)) {
      toast.error(`Score must be between 0 and ${task.maxScore}`);
      return;
    }

    setSaving(prev => ({ ...prev, [studentId]: true }));

    try {
      if (score !== undefined) {
        await upsertGrade(studentId, task.id, score);
        toast.success("Grade saved");
      } else {
        const existingGrade = grades.find(g => g.studentId === studentId);
        if (existingGrade) {
          await deleteGrade(existingGrade.id);
          toast.success("Grade removed");
        }
      }
      loadData();
      onDataChange?.();
    } catch (error) {
      toast.error("Failed to save grade");
    } finally {
      setSaving(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter students for the grading tab search
  const gradingFilteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    (s.rollNumber && s.rollNumber.toLowerCase().includes(studentSearchQuery.toLowerCase()))
  );

  const gradedCount = students.filter(s => getStudentGrade(s.id)).length;

  // Bulk grade all visible students
  const handleBulkGrade = async (score: number) => {
    const ungradedStudents = gradingFilteredStudents.filter(s => !getStudentGrade(s.id));
    if (ungradedStudents.length === 0) {
      toast.info("All visible students are already graded");
      return;
    }

    for (const student of ungradedStudents) {
      await upsertGrade(student.id, task.id, score);
    }
    toast.success(`Graded ${ungradedStudents.length} students with ${score}/${task.maxScore}`);
    loadData();
    onDataChange?.();
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "grading" | "files")} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:max-w-md h-auto">
          <TabsTrigger value="grading" className="gap-2 py-3 text-xs sm:text-sm">
            <ClipboardList className="h-4 w-4 shrink-0" />
            <span className="truncate">Grading ({gradedCount}/{students.length})</span>
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-2 py-3 text-xs sm:text-sm">
            <Paperclip className="h-4 w-4 shrink-0" />
            <span className="truncate">Files ({files.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Manual Grading Tab */}
        <TabsContent value="grading">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-card-foreground">
                    Grade Students
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Enter scores directly for each student. Files are optional.
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <CheckCheck className="h-4 w-4" />
                        <span className="hidden sm:inline">Bulk Grade</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 bg-popover" align="end">
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Grade all ungraded students</p>
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" variant="outline" onClick={() => handleBulkGrade(task.maxScore)}>
                            Full ({task.maxScore})
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleBulkGrade(Math.round(task.maxScore * 0.75))}>
                            75%
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleBulkGrade(Math.round(task.maxScore * 0.5))}>
                            50%
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleBulkGrade(0)}>
                            Zero
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {/* Search bar for students */}
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students by name or roll number..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <User className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No students in this class</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add students to start grading
                  </p>
                </div>
              ) : gradingFilteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Search className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No students match your search</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {gradingFilteredStudents.map((student) => {
                    const grade = getStudentGrade(student.id);
                    const studentFiles = files.filter(f => f.studentId === student.id);
                    const displayName = getStudentDisplayName(student, duplicateNameIds);
                    return (
                      <div
                        key={student.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-background border border-border"
                      >
                        {student.photo ? (
                          <img
                            src={student.photo}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-sm text-primary-foreground font-medium">
                            {student.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{displayName}</p>
                          {studentFiles.length > 0 && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Paperclip className="h-3 w-3" />
                              {studentFiles.length} file(s) attached
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max={task.maxScore}
                            defaultValue={grade?.score?.toString() || ""}
                            placeholder="Score"
                            className="h-9 text-sm w-24"
                            disabled={saving[student.id]}
                            onBlur={(e) => {
                              const currentScore = grade?.score?.toString() || "";
                              if (e.target.value !== currentScore) {
                                handleManualGrade(student.id, e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                          />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">/ {task.maxScore}</span>
                          {grade && (
                            <Badge variant="secondary" className="ml-2">
                              {Math.round((grade.score / task.maxScore) * 100)}%
                            </Badge>
                          )}
                          {saving[student.id] && (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <Card className="border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-card-foreground">
                  Files & Submissions
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload answer sheets, rubrics, or reference materials (optional)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
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
                  {uploading ? "Uploading..." : "Upload Files"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No files uploaded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload student answer sheets, question papers, rubrics, etc.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {files.map((file) => {
                    const FileIcon = getFileIcon(file.type);
                    const studentName = getStudentName(file.studentId);
                    return (
                      <div
                        key={file.id}
                        className="flex flex-col rounded-lg bg-background border border-border overflow-hidden"
                      >
                        <div className="flex items-center gap-3 p-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
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
                        </div>
                        
                        {/* Student Tag */}
                        <div className="px-3 pb-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <Popover 
                              open={editingFileId === file.id} 
                              onOpenChange={(open) => {
                                setEditingFileId(open ? file.id : null);
                                if (!open) setSearchQuery("");
                              }}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1.5 text-xs flex-1 justify-start"
                                >
                                  <User className="h-3.5 w-3.5" />
                                  {studentName || "Tag student"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-0 bg-popover border border-border shadow-lg z-50" align="start">
                                <div className="p-2 border-b border-border">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      placeholder="Search students..."
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
                                      className="pl-8 h-8"
                                    />
                                  </div>
                                </div>
                                <ScrollArea className="max-h-48">
                                  <div className="p-1">
                                    {file.studentId && (
                                      <button
                                        onClick={() => handleSelectStudent(file.id, null)}
                                        className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted text-destructive"
                                      >
                                        Remove tag
                                      </button>
                                    )}
                                    {filteredStudents.length === 0 ? (
                                      <p className="px-3 py-2 text-sm text-muted-foreground">
                                        No students found
                                      </p>
                                    ) : (
                                      filteredStudents.map((student) => (
                                        <button
                                          key={student.id}
                                          onClick={() => handleSelectStudent(file.id, student.id)}
                                          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted flex items-center gap-2"
                                        >
                                          {student.photo ? (
                                            <img
                                              src={student.photo}
                                              alt=""
                                              className="h-6 w-6 rounded-full object-cover"
                                            />
                                          ) : (
                                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground">
                                              {student.name.charAt(0)}
                                            </div>
                                          )}
                                          <span>{student.name}</span>
                                          {student.id === file.studentId && (
                                            <Check className="h-4 w-4 ml-auto text-primary" />
                                          )}
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </ScrollArea>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 border-t border-border p-2 bg-muted/30">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={() => handlePreview(file)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownload(file)}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteFileId(file.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* File Preview Dialog - Scrollable */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle className="truncate pr-4">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-6 pb-6">
            <div className="min-h-0">
              {previewFile?.type.startsWith("image/") && (
                <img
                  src={URL.createObjectURL(previewFile.data)}
                  alt={previewFile.name}
                  className="max-w-full h-auto rounded-lg object-contain"
                />
              )}
              {previewFile?.type === "application/pdf" && (
                <iframe
                  src={URL.createObjectURL(previewFile.data)}
                  className="w-full h-[75vh] rounded-lg border-0"
                  title={previewFile.name}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete File Confirmation */}
      <AlertDialog open={!!deleteFileId} onOpenChange={() => setDeleteFileId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this file and any associated grade.
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
