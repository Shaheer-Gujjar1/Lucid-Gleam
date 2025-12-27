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
import { Plus, Pencil, Trash2, Building2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  getAllInstitutes,
  addInstitute,
  updateInstitute,
  deleteInstitute,
  getClassesByInstitute,
  Institute,
} from "@/lib/db";

interface InstituteListProps {
  onSelectInstitute: (institute: Institute) => void;
}

export function InstituteList({ onSelectInstitute }: InstituteListProps) {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstitute, setEditingInstitute] = useState<Institute | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
  });

  useEffect(() => {
    loadInstitutes();
  }, []);

  async function loadInstitutes() {
    const data = await getAllInstitutes();
    setInstitutes(data);
    
    // Load class counts for each institute
    const counts: Record<string, number> = {};
    for (const inst of data) {
      const classes = await getClassesByInstitute(inst.id);
      counts[inst.id] = classes.length;
    }
    setClassCounts(counts);
    setLoading(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter an institute name");
      return;
    }

    try {
      if (editingInstitute) {
        await updateInstitute({
          ...editingInstitute,
          name: formData.name,
          address: formData.address,
        });
        toast.success("Institute updated successfully");
      } else {
        await addInstitute({
          name: formData.name,
          address: formData.address,
        });
        toast.success("Institute added successfully");
      }
      setIsDialogOpen(false);
      setEditingInstitute(null);
      setFormData({ name: "", address: "" });
      loadInstitutes();
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleEdit = (e: React.MouseEvent, institute: Institute) => {
    e.stopPropagation();
    setEditingInstitute(institute);
    setFormData({
      name: institute.name,
      address: institute.address || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteInstitute(deleteId);
      toast.success("Institute deleted");
      setDeleteId(null);
      loadInstitutes();
    }
  };

  const filteredInstitutes = institutes.filter((i) =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Institutes</h1>
          <p className="text-muted-foreground">
            Manage your schools and organizations.
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingInstitute(null);
              setFormData({ name: "", address: "" });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Institute
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingInstitute ? "Edit Institute" : "Add New Institute"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter institute name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address (optional)</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="Enter address"
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
                  {editingInstitute ? "Update" : "Add"} Institute
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search institutes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredInstitutes.length === 0 ? (
        <Card className="border-dashed border-2 border-border/30 bg-card/60 backdrop-blur-xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">
              {institutes.length === 0
                ? "No institutes yet. Add your first institute!"
                : "No institutes match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredInstitutes.map((institute) => (
            <Card
              key={institute.id}
              className="group cursor-pointer border border-border/30 bg-card/60 backdrop-blur-xl shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] hover:bg-card/80"
              onClick={() => onSelectInstitute(institute)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-card-foreground truncate">
                      {institute.name}
                    </h3>
                    {institute.address && (
                      <p className="text-sm text-muted-foreground truncate">
                        {institute.address}
                      </p>
                    )}
                    <p className="text-sm text-primary mt-1">
                      {classCounts[institute.id] || 0} classes
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3"
                    onClick={(e) => handleEdit(e, institute)}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="ml-1.5 hidden xs:inline">Edit</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-9 px-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(institute.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="ml-1.5 hidden xs:inline">Delete</span>
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
            <AlertDialogTitle>Delete Institute?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this institute and all its classes, students, tasks, and grades.
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
