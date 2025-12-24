import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Clock, BookOpen, Save, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Class, ClassSubject, LecturePeriod, getClass, updateClass } from "@/lib/db";

interface ClassScheduleProps {
  classId: string;
}

const SUBJECT_COLORS = [
  { name: "Purple", value: "bg-primary/20 text-primary" },
  { name: "Blue", value: "bg-chart-1/20 text-chart-1" },
  { name: "Green", value: "bg-chart-2/20 text-chart-2" },
  { name: "Orange", value: "bg-chart-3/20 text-chart-3" },
  { name: "Pink", value: "bg-chart-4/20 text-chart-4" },
  { name: "Cyan", value: "bg-chart-5/20 text-chart-5" },
];

export function ClassSchedule({ classId }: ClassScheduleProps) {
  const [classData, setClassData] = useState<Class | null>(null);
  const [subjects, setSubjects] = useState<ClassSubject[]>([]);
  const [lectureCount, setLectureCount] = useState<number>(0);
  const [periods, setPeriods] = useState<LecturePeriod[]>([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0].value);
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClass();
  }, [classId]);

  async function loadClass() {
    const data = await getClass(classId);
    if (data) {
      setClassData(data);
      setSubjects(data.subjects || []);
      setLectureCount(data.lectureCount || 0);
      setPeriods(data.lecturePeriods || []);
    }
    setLoading(false);
  }

  const addSubject = () => {
    if (!newSubjectName.trim()) {
      toast.error("Please enter a subject name");
      return;
    }
    
    const newSubject: ClassSubject = {
      id: crypto.randomUUID(),
      name: newSubjectName.trim(),
      color: newSubjectColor,
    };
    
    setSubjects([...subjects, newSubject]);
    setNewSubjectName("");
    toast.success("Subject added - remember to save!");
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
    toast.success("Subject removed - remember to save!");
  };

  const startEditSubject = (subject: ClassSubject) => {
    setEditingSubject(subject.id);
    setEditSubjectName(subject.name);
  };

  const saveEditSubject = (id: string) => {
    if (!editSubjectName.trim()) {
      toast.error("Subject name cannot be empty");
      return;
    }
    setSubjects(subjects.map(s => 
      s.id === id ? { ...s, name: editSubjectName.trim() } : s
    ));
    setEditingSubject(null);
    setEditSubjectName("");
    toast.success("Subject updated - remember to save!");
  };

  const addLecture = () => {
    const newLectureNum = periods.length + 1;
    const lastPeriod = periods[periods.length - 1];
    
    let startTime = "09:00";
    let endTime = "09:45";
    
    if (lastPeriod) {
      // Calculate next period based on last one
      const [lastEndHour, lastEndMin] = lastPeriod.endTime.split(":").map(Number);
      const startHour = lastEndMin >= 55 ? lastEndHour + 1 : lastEndHour;
      const startMin = (lastEndMin + 5) % 60;
      startTime = `${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}`;
      
      const endHour = startMin >= 15 ? startHour + 1 : startHour;
      const endMin = (startMin + 45) % 60;
      endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;
    }
    
    setPeriods([...periods, {
      number: newLectureNum,
      startTime,
      endTime,
    }]);
    setLectureCount(newLectureNum);
    toast.success("Lecture added - remember to save!");
  };

  const removeLecture = (index: number) => {
    const newPeriods = periods.filter((_, i) => i !== index).map((p, i) => ({
      ...p,
      number: i + 1,
    }));
    setPeriods(newPeriods);
    setLectureCount(newPeriods.length);
    toast.success("Lecture removed - remember to save!");
  };

  const updatePeriodTime = (index: number, field: "startTime" | "endTime", value: string) => {
    const newPeriods = [...periods];
    newPeriods[index] = { ...newPeriods[index], [field]: value };
    setPeriods(newPeriods);
  };

  const saveSchedule = async () => {
    if (!classData) return;
    
    setSaving(true);
    try {
      await updateClass({
        ...classData,
        subjects,
        lectureCount: periods.length,
        lecturePeriods: periods,
      });
      toast.success("Schedule saved successfully");
    } catch (error) {
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
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
      {/* Subjects Section */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <BookOpen className="h-5 w-5" />
            Subjects
          </CardTitle>
          <CardDescription>
            Add all subjects you teach for this class. This helps track attendance per subject.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Subjects */}
          <div className="flex flex-wrap gap-2">
            {subjects.map((subject) => (
              <div key={subject.id} className="flex items-center gap-1">
                {editingSubject === subject.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editSubjectName}
                      onChange={(e) => setEditSubjectName(e.target.value)}
                      className="h-8 w-32"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditSubject(subject.id);
                        if (e.key === "Escape") setEditingSubject(null);
                      }}
                    />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => saveEditSubject(subject.id)}>
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingSubject(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Badge
                    variant="outline"
                    className={`text-sm py-1.5 px-3 border-transparent ${subject.color || ""}`}
                  >
                    {subject.name}
                    <button
                      onClick={() => startEditSubject(subject)}
                      className="ml-2 hover:text-primary transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => removeSubject(subject.id)}
                      className="ml-1 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            ))}
            {subjects.length === 0 && (
              <p className="text-sm text-muted-foreground">No subjects added yet. Add your first subject below.</p>
            )}
          </div>

          {/* Add Subject Form */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <div className="flex-1">
              <Input
                placeholder="Subject name (e.g., Mathematics)"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSubject()}
              />
            </div>
            <Select value={newSubjectColor} onValueChange={setNewSubjectColor}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Color" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECT_COLORS.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${color.value.split(" ")[0]}`} />
                      {color.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addSubject} className="gap-2">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lecture Periods Section */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <Clock className="h-5 w-5" />
            Lecture Schedule
          </CardTitle>
          <CardDescription>
            Add lecture periods and set their timings. Click the + button to add new lectures.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Period Timings */}
          <div className="space-y-3">
            {periods.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No lectures added yet. Click the button below to add your first lecture.
              </p>
            ) : (
              <div className="grid gap-3">
                {periods.map((period, index) => (
                  <div
                    key={period.number}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <span className="font-medium min-w-[80px]">Lecture {period.number}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={period.startTime}
                        onChange={(e) => updatePeriodTime(index, "startTime", e.target.value)}
                        className="w-[120px]"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={period.endTime}
                        onChange={(e) => updatePeriodTime(index, "endTime", e.target.value)}
                        className="w-[120px]"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeLecture(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <Button variant="outline" onClick={addLecture} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Add Lecture Period
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSchedule} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Schedule"}
        </Button>
      </div>
    </div>
  );
}