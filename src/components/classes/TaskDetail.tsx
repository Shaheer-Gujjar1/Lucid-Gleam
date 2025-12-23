import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  Task,
  Student,
  TaskFile,
  getFilesByTask,
  addTaskFile,
  deleteTaskFile,
  updateTaskFile,
  getStudentsByClass,
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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<TaskFile | null>(null);
  const [editingFile, setEditingFile] = useState<TaskFile | null>(null);
  const [editScore, setEditScore] = useState("");
  const [editStudentId, setEditStudentId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [task.id, classId]);

  async function loadData() {
    setLoading(true);
    const [taskFiles, classStudents] = await Promise.all([
      getFilesByTask(task.id),
      getStudentsByClass(classId),
    ]);
    
    setFiles(taskFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setStudents(classStudents.sort((a, b) => a.name.localeCompare(b.name)));
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

  const handleEditFile = (file: TaskFile) => {
    setEditingFile(file);
    setEditScore(file.score?.toString() || "");
    setEditStudentId(file.studentId || "");
  };

  const handleSaveFileDetails = async () => {
    if (!editingFile) return;

    const score = editScore ? parseFloat(editScore) : undefined;
    if (editScore && (isNaN(score!) || score! < 0 || score! > task.maxScore)) {
      toast.error(`Score must be between 0 and ${task.maxScore}`);
      return;
    }

    setSaving(prev => ({ ...prev, [editingFile.id]: true }));

    try {
      await updateTaskFile({
        ...editingFile,
        studentId: editStudentId || undefined,
        score,
      });
      toast.success("File details saved");
      setEditingFile(null);
      loadData();
      onDataChange?.();
    } catch (error) {
      toast.error("Failed to save file details");
    } finally {
      setSaving(prev => ({ ...prev, [editingFile.id]: false }));
    }
  };

  const getStudentName = (studentId?: string) => {
    if (!studentId) return null;
    const student = students.find(s => s.id === studentId);
    return student?.name;
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

      {/* Files Section - Full Width */}
      <Card className="border-none shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-card-foreground">
            Student Submissions & Reference Files
          </CardTitle>
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
                    
                    {/* Student & Grade Info */}
                    <div className="px-3 pb-2 space-y-1">
                      {studentName && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-foreground font-medium">{studentName}</span>
                        </div>
                      )}
                      {file.score !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          Score: {file.score}/{task.maxScore}
                        </Badge>
                      )}
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
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => handleEditFile(file)}
                      >
                        <User className="h-3.5 w-3.5 mr-1" />
                        Tag
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

      {/* File Preview Dialog - Scrollable */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle className="truncate pr-4">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 px-6 pb-6">
            <div className="min-h-0">
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
                  className="w-full h-[75vh] rounded-lg border-0"
                  title={previewFile.name}
                />
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit File Details Dialog */}
      <Dialog open={!!editingFile} onOpenChange={() => setEditingFile(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tag Student & Grade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Student</label>
              <Select value={editStudentId} onValueChange={setEditStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No student</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Score (out of {task.maxScore})
              </label>
              <Input
                type="number"
                min="0"
                max={task.maxScore}
                value={editScore}
                onChange={(e) => setEditScore(e.target.value)}
                placeholder="Enter score (optional)"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingFile(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveFileDetails}
              disabled={saving[editingFile?.id || ""]}
              className="gap-2"
            >
              {saving[editingFile?.id || ""] ? (
                "Saving..."
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
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
