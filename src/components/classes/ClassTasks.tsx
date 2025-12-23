import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Pencil, Trash2, FileText, Presentation, FlaskConical, FolderKanban, MoreHorizontal, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { getTasksByClass, addTask, updateTask, deleteTask, getFilesByTask, Task } from "@/lib/db";
import { TaskFiles } from "./TaskFiles";

const taskTypes = [
  { value: "assignment", label: "Assignment", icon: FileText },
  { value: "quiz", label: "Quiz", icon: FlaskConical },
  { value: "presentation", label: "Presentation", icon: Presentation },
  { value: "project", label: "Project", icon: FolderKanban },
  { value: "other", label: "Other", icon: MoreHorizontal },
] as const;

const taskTypeColors: Record<string, string> = {
  assignment: "bg-chart-1/20 text-accent-foreground border-chart-1/30",
  quiz: "bg-chart-2/20 text-accent-foreground border-chart-2/30",
  presentation: "bg-chart-3/20 text-accent-foreground border-chart-3/30",
  project: "bg-chart-4/20 text-accent-foreground border-chart-4/30",
  other: "bg-muted text-muted-foreground border-border",
};

interface ClassTasksProps {
  classId: string;
  onDataChange?: () => void;
}

export function ClassTasks({ classId, onDataChange }: ClassTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filesTaskId, setFilesTaskId] = useState<string | null>(null);
  const [filesTaskTitle, setFilesTaskTitle] = useState<string>("");

  const [formData, setFormData] = useState({
    title: "",
    type: "assignment" as Task["type"],
    description: "",
    maxScore: "100",
    dueDate: "",
  });

  useEffect(() => {
    loadTasks();
  }, [classId]);

  async function loadTasks() {
    const data = await getTasksByClass(classId);
    setTasks(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    
    // Load file counts for each task
    const counts: Record<string, number> = {};
    for (const task of data) {
      const files = await getFilesByTask(task.id);
      counts[task.id] = files.length;
    }
    setFileCounts(counts);
    setLoading(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    const maxScore = parseInt(formData.maxScore);
    if (isNaN(maxScore) || maxScore <= 0) {
      toast.error("Please enter a valid max score");
      return;
    }

    try {
      if (editingTask) {
        await updateTask({
          ...editingTask,
          title: formData.title,
          type: formData.type,
          description: formData.description,
          maxScore,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        });
        toast.success("Task updated successfully");
      } else {
        await addTask({
          classId,
          title: formData.title,
          type: formData.type,
          description: formData.description,
          maxScore,
          dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        });
        toast.success("Task added successfully");
      }
      setIsDialogOpen(false);
      setEditingTask(null);
      setFormData({
        title: "",
        type: "assignment",
        description: "",
        maxScore: "100",
        dueDate: "",
      });
      loadTasks();
      onDataChange?.();
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      type: task.type,
      description: task.description || "",
      maxScore: task.maxScore.toString(),
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().split("T")[0]
        : "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTask(deleteId);
      toast.success("Task deleted");
      setDeleteId(null);
      loadTasks();
      onDataChange?.();
    }
  };

  const filteredTasks =
    filterType === "all"
      ? tasks
      : tasks.filter((t) => t.type === filterType);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("all")}
          >
            All
          </Button>
          {taskTypes.map((type) => (
            <Button
              key={type.value}
              variant={filterType === type.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type.value)}
              className="gap-2"
            >
              <type.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{type.label}</span>
            </Button>
          ))}
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingTask(null);
              setFormData({
                title: "",
                type: "assignment",
                description: "",
                maxScore: "100",
                dueDate: "",
              });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? "Edit Task" : "Add New Task"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter task title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: Task["type"]) =>
                    setFormData((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxScore">Max Score *</Label>
                <Input
                  id="maxScore"
                  type="number"
                  min="1"
                  value={formData.maxScore}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, maxScore: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date (optional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTask ? "Update" : "Add"} Task
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {filteredTasks.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg text-muted-foreground">
              {tasks.length === 0
                ? "No tasks yet. Create your first task!"
                : "No tasks match this filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => {
            const TypeIcon =
              taskTypes.find((t) => t.value === task.type)?.icon || FileText;
            return (
              <Card
                key={task.id}
                className={`group border-2 shadow-lg transition-all hover:shadow-xl ${taskTypeColors[task.type]}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <TypeIcon className="h-6 w-6" />
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {task.title}
                        </h3>
                        <p className="text-sm capitalize text-muted-foreground">
                          {task.type}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-background px-3 py-1 text-sm font-medium text-foreground">
                      {task.maxScore} pts
                    </span>
                  </div>

                  {task.description && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {task.dueDate && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  )}

                  <div className="mt-4 flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilesTaskId(task.id);
                        setFilesTaskTitle(task.title);
                      }}
                      className="gap-1"
                    >
                      <Paperclip className="h-4 w-4" />
                      {fileCounts[task.id] > 0 && (
                        <span className="text-xs">{fileCounts[task.id]}</span>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(task)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(task.id)}
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this task and all associated grades and files.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TaskFiles
        taskId={filesTaskId || ""}
        taskTitle={filesTaskTitle}
        open={!!filesTaskId}
        onOpenChange={(open) => {
          if (!open) {
            setFilesTaskId(null);
            loadTasks(); // Refresh file counts
          }
        }}
      />
    </div>
  );
}
