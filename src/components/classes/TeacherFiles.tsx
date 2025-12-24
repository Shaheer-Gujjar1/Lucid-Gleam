import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Upload,
  FileText,
  Image,
  File,
  Trash2,
  Download,
  Eye,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import {
  TeacherFile,
  getTeacherFilesByClass,
  addTeacherFile,
  deleteTeacherFile,
} from "@/lib/db";

interface TeacherFilesProps {
  classId: string;
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

export function TeacherFiles({ classId }: TeacherFilesProps) {
  const [files, setFiles] = useState<TeacherFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<TeacherFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles();
  }, [classId]);

  async function loadFiles() {
    setLoading(true);
    const data = await getTeacherFilesByClass(classId);
    setFiles(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setLoading(false);
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("File is too large. Max size is 10MB.");
      return;
    }

    if (!ALLOWED_TYPES.includes(selectedFile.type) && !selectedFile.type.startsWith("image/")) {
      toast.error("Unsupported file type.");
      return;
    }

    setPendingFile(selectedFile);
    setDescription("");
    setUploadDialogOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!pendingFile) return;

    setUploading(true);
    try {
      await addTeacherFile({
        classId,
        name: pendingFile.name,
        type: pendingFile.type,
        size: pendingFile.size,
        data: pendingFile,
        description: description.trim() || undefined,
      });
      toast.success("File uploaded successfully");
      setUploadDialogOpen(false);
      setPendingFile(null);
      setDescription("");
      loadFiles();
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTeacherFile(deleteId);
      toast.success("File deleted");
      setDeleteId(null);
      loadFiles();
    }
  };

  const handleDownload = (file: TeacherFile) => {
    const url = URL.createObjectURL(file.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePreview = (file: TeacherFile) => {
    if (file.type.startsWith("image/") || file.type === "application/pdf") {
      setPreviewFile(file);
    } else {
      handleDownload(file);
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
      <div className="flex justify-end">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          id="teacher-file-upload"
        />
        <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
          <Upload className="h-4 w-4" />
          Upload File
        </Button>
      </div>

      {files.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No personal files yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload lesson plans, notes, resources, or any reference materials
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.type);
            return (
              <Card key={file.id} className="group border-none shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                      <FileIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                      {file.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {file.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(file)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(file.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {pendingFile && (
              <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{pendingFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(pendingFile.size)}
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a note about this file..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle className="truncate pr-4">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-6 pb-6">
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
                className="w-full h-[70vh] rounded-lg"
                title={previewFile.name}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}