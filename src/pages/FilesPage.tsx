import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  Image,
  File,
  Trash2,
  Download,
  Eye,
  FolderOpen,
  Search,
  Filter,
  Building2,
  BookOpen,
  Users,
  X,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import {
  TeacherFile,
  getAllTeacherFiles,
  addTeacherFile,
  deleteTeacherFile,
  updateTeacherFile,
  getAllInstitutes,
  getAllClasses,
  getAllStudents,
  Institute,
  Class,
  Student,
} from "@/lib/db";

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

export default function FilesPage() {
  const [files, setFiles] = useState<TeacherFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<TeacherFile | null>(null);
  const [editingFile, setEditingFile] = useState<TeacherFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterInstitute, setFilterInstitute] = useState<string>("");
  const [filterClass, setFilterClass] = useState<string>("");
  const [filterStudent, setFilterStudent] = useState<string>("");

  // Tagging data
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Upload tags
  const [selectedInstitute, setSelectedInstitute] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [filesData, institutesData, classesData, studentsData] = await Promise.all([
      getAllTeacherFiles(),
      getAllInstitutes(),
      getAllClasses(),
      getAllStudents(),
    ]);
    setFiles(filesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setInstitutes(institutesData);
    setClasses(classesData);
    setStudents(studentsData);
    setLoading(false);
  }

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesInstitute = !filterInstitute || file.instituteId === filterInstitute;
    const matchesClass = !filterClass || file.classId === filterClass;
    const matchesStudent = !filterStudent || file.studentId === filterStudent;
    return matchesSearch && matchesInstitute && matchesClass && matchesStudent;
  });

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
    setSelectedInstitute("");
    setSelectedClass("");
    setSelectedStudent("");
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
        name: pendingFile.name,
        type: pendingFile.type,
        size: pendingFile.size,
        data: pendingFile,
        description: description.trim() || undefined,
        instituteId: selectedInstitute || undefined,
        classId: selectedClass || undefined,
        studentId: selectedStudent || undefined,
      });
      toast.success("File uploaded successfully");
      setUploadDialogOpen(false);
      setPendingFile(null);
      setDescription("");
      loadData();
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateTags = async () => {
    if (!editingFile) return;

    try {
      await updateTeacherFile({
        ...editingFile,
        instituteId: selectedInstitute || undefined,
        classId: selectedClass || undefined,
        studentId: selectedStudent || undefined,
      });
      toast.success("File tags updated");
      setEditingFile(null);
      loadData();
    } catch (error) {
      toast.error("Failed to update tags");
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTeacherFile(deleteId);
      toast.success("File deleted");
      setDeleteId(null);
      loadData();
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

  const openEditTags = (file: TeacherFile) => {
    setEditingFile(file);
    setSelectedInstitute(file.instituteId || "");
    setSelectedClass(file.classId || "");
    setSelectedStudent(file.studentId || "");
  };

  const getTagLabels = (file: TeacherFile) => {
    const tags = [];
    if (file.instituteId) {
      const inst = institutes.find(i => i.id === file.instituteId);
      if (inst) tags.push({ type: 'institute', label: inst.name });
    }
    if (file.classId) {
      const cls = classes.find(c => c.id === file.classId);
      if (cls) tags.push({ type: 'class', label: cls.name });
    }
    if (file.studentId) {
      const student = students.find(s => s.id === file.studentId);
      if (student) tags.push({ type: 'student', label: student.name });
    }
    return tags;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterInstitute("");
    setFilterClass("");
    setFilterStudent("");
  };

  const hasActiveFilters = searchQuery || filterInstitute || filterClass || filterStudent;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-lg">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Files</h1>
            <p className="text-muted-foreground text-sm">Manage all your teaching materials</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
          <Upload className="h-4 w-4" />
          Upload File
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterInstitute || "__all__"} onValueChange={(v) => setFilterInstitute(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Institute" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Institutes</SelectItem>
                {institutes.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterClass || "__all__"} onValueChange={(v) => setFilterClass(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <BookOpen className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStudent || "__all__"} onValueChange={(v) => setFilterStudent(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Student" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Students</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Files Grid */}
      {filteredFiles.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">
              {hasActiveFilters ? "No files match your filters" : "No files yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload lesson plans, notes, resources, or any reference materials
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFiles.map((file) => {
            const FileIcon = getFileIcon(file.type);
            const tags = getTagLabels(file);
            return (
              <Card key={file.id} className="group border-none shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted shrink-0">
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
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tags.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag.type === 'institute' && <Building2 className="h-3 w-3 mr-1" />}
                              {tag.type === 'class' && <BookOpen className="h-3 w-3 mr-1" />}
                              {tag.type === 'student' && <Users className="h-3 w-3 mr-1" />}
                              {tag.label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditTags(file)}
                    >
                      <Tag className="h-4 w-4" />
                    </Button>
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
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags (optional)</Label>
              <div className="grid gap-2">
                <Select value={selectedInstitute || "__none__"} onValueChange={(v) => setSelectedInstitute(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <Building2 className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select Institute" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {institutes.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedClass || "__none__"} onValueChange={(v) => setSelectedClass(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <BookOpen className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedStudent || "__none__"} onValueChange={(v) => setSelectedStudent(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <Users className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select Student" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

      {/* Edit Tags Dialog */}
      <Dialog open={!!editingFile} onOpenChange={() => setEditingFile(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit File Tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingFile && (
              <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{editingFile.name}</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="grid gap-2">
                <Select value={selectedInstitute || "__none__"} onValueChange={(v) => setSelectedInstitute(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <Building2 className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select Institute" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {institutes.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedClass || "__none__"} onValueChange={(v) => setSelectedClass(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <BookOpen className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedStudent || "__none__"} onValueChange={(v) => setSelectedStudent(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <Users className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Select Student" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingFile(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTags}>
                Save Tags
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
