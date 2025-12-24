import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, BookOpen, Search, ArrowLeft, Users } from "lucide-react";
import { toast } from "sonner";
import {
  getClassesByInstitute,
  addClass,
  updateClass,
  deleteClass,
  getStudentsByClass,
  Institute,
  Class,
} from "@/lib/db";

interface ClassListProps {
  institute: Institute;
  onBack: () => void;
  onSelectClass: (classData: Class) => void;
}

export function ClassList({ institute, onBack, onSelectClass }: ClassListProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
  });

  useEffect(() => {
    loadClasses();
  }, [institute.id]);

  async function loadClasses() {
    const data = await getClassesByInstitute(institute.id);
    setClasses(data);
    
    // Load student counts for each class
    const counts: Record<string, number> = {};
    for (const cls of data) {
      const students = await getStudentsByClass(cls.id);
      counts[cls.id] = students.length;
    }
    setStudentCounts(counts);
    setLoading(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter a class name");
      return;
    }

    try {
      if (editingClass) {
        await updateClass({
          ...editingClass,
          name: formData.name,
        });
        toast.success("Class updated successfully");
      } else {
        await addClass({
          instituteId: institute.id,
          name: formData.name,
        });
        toast.success("Class added successfully");
      }
      setIsDialogOpen(false);
      setEditingClass(null);
      setFormData({ name: "" });
      loadClasses();
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleEdit = (e: React.MouseEvent, classData: Class) => {
    e.stopPropagation();
    setEditingClass(classData);
    setFormData({
      name: classData.name,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteClass(deleteId);
      toast.success("Class deleted");
      setDeleteId(null);
      loadClasses();
    }
  };

  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
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
          <h1 className="text-3xl font-bold text-foreground">{institute.name}</h1>
          <p className="text-muted-foreground">Manage classes for this institute.</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingClass(null);
              setFormData({ name: "" });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Class
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingClass ? "Edit Class" : "Add New Class"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Class Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Grade 10-A, Section B"
                />
                <p className="text-xs text-muted-foreground">
                  You can add subjects in the Schedule tab after creating the class.
                </p>
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
                  {editingClass ? "Update" : "Add"} Class
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search classes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredClasses.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">
              {classes.length === 0
                ? "No classes yet. Add your first class!"
                : "No classes match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((classData) => (
            <Card
              key={classData.id}
              className="group cursor-pointer border-none shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]"
              onClick={() => onSelectClass(classData)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-2/20 text-accent-foreground">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-card-foreground truncate">
                      {classData.name}
                    </h3>
                    {classData.subject && (
                      <p className="text-sm text-muted-foreground truncate">
                        {classData.subject}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-sm text-primary mt-1">
                      <Users className="h-3 w-3" />
                      {studentCounts[classData.id] || 0} students
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleEdit(e, classData)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(classData.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this class and all its students, tasks, and grades.
              This action cannot be undone.
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
