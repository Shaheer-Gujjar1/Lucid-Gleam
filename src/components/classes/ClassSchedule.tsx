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
import { Plus, Trash2, Clock, BookOpen, Save, GripVertical } from "lucide-react";
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

const DEFAULT_PERIODS: LecturePeriod[] = [
  { number: 1, startTime: "09:00", endTime: "09:45" },
  { number: 2, startTime: "09:50", endTime: "10:35" },
  { number: 3, startTime: "10:40", endTime: "11:25" },
  { number: 4, startTime: "11:30", endTime: "12:15" },
  { number: 5, startTime: "13:00", endTime: "13:45" },
  { number: 6, startTime: "13:50", endTime: "14:35" },
];

export function ClassSchedule({ classId }: ClassScheduleProps) {
  const [classData, setClassData] = useState<Class | null>(null);
  const [subjects, setSubjects] = useState<ClassSubject[]>([]);
  const [lectureCount, setLectureCount] = useState<number>(6);
  const [periods, setPeriods] = useState<LecturePeriod[]>(DEFAULT_PERIODS);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0].value);
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
      setLectureCount(data.lectureCount || 6);
      setPeriods(data.lecturePeriods || DEFAULT_PERIODS.slice(0, data.lectureCount || 6));
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
    toast.success("Subject added");
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
    toast.success("Subject removed");
  };

  const handleLectureCountChange = (count: number) => {
    setLectureCount(count);
    
    // Adjust periods array
    if (count > periods.length) {
      const newPeriods = [...periods];
      for (let i = periods.length + 1; i <= count; i++) {
        const lastPeriod = newPeriods[newPeriods.length - 1];
        const startHour = parseInt(lastPeriod?.endTime?.split(":")[0] || "14");
        const startMin = parseInt(lastPeriod?.endTime?.split(":")[1] || "00") + 5;
        newPeriods.push({
          number: i,
          startTime: `${String(startHour).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`,
          endTime: `${String(startHour + (startMin >= 60 ? 1 : 0)).padStart(2, "0")}:${String((startMin + 45) % 60).padStart(2, "0")}`,
        });
      }
      setPeriods(newPeriods);
    } else {
      setPeriods(periods.slice(0, count));
    }
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
        lectureCount,
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
              <Badge
                key={subject.id}
                variant="secondary"
                className={`text-sm py-1.5 px-3 ${subject.color || ""}`}
              >
                {subject.name}
                <button
                  onClick={() => removeSubject(subject.id)}
                  className="ml-2 hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {subjects.length === 0 && (
              <p className="text-sm text-muted-foreground">No subjects added yet</p>
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
            Configure the number of lectures per day and their timings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Lecture Count */}
          <div className="flex items-center gap-4">
            <Label className="min-w-fit">Lectures per day:</Label>
            <Select
              value={String(lectureCount)}
              onValueChange={(v) => handleLectureCountChange(Number(v))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <SelectItem key={num} value={String(num)}>
                    {num} lecture{num > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Timings */}
          <div className="space-y-3">
            <Label>Lecture Timings</Label>
            <div className="grid gap-3">
              {periods.map((period, index) => (
                <div
                  key={period.number}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
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
                </div>
              ))}
            </div>
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