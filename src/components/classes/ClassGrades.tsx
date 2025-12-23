import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Check } from "lucide-react";
import { toast } from "sonner";
import {
  getStudentsByClass,
  getTasksByClass,
  getAllGrades,
  upsertGrade,
  Student,
  Task,
  Grade,
} from "@/lib/db";

interface GradeEntry {
  studentId: string;
  taskId: string;
  score: string;
  saved: boolean;
}

interface ClassGradesProps {
  classId: string;
}

export function ClassGrades({ classId }: ClassGradesProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<string>("all");
  const [gradeEntries, setGradeEntries] = useState<Record<string, GradeEntry>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, [classId]);

  async function loadData() {
    const [s, t, allGrades] = await Promise.all([
      getStudentsByClass(classId),
      getTasksByClass(classId),
      getAllGrades(),
    ]);
    setStudents(s);
    setTasks(t);
    
    // Filter grades for this class
    const studentIds = new Set(s.map((st) => st.id));
    const taskIds = new Set(t.map((tk) => tk.id));
    const classGrades = allGrades.filter(
      (g) => studentIds.has(g.studentId) && taskIds.has(g.taskId)
    );
    setGrades(classGrades);

    // Initialize grade entries
    const entries: Record<string, GradeEntry> = {};
    s.forEach((student) => {
      t.forEach((task) => {
        const key = `${student.id}-${task.id}`;
        const existingGrade = classGrades.find(
          (grade) => grade.studentId === student.id && grade.taskId === task.id
        );
        entries[key] = {
          studentId: student.id,
          taskId: task.id,
          score: existingGrade ? existingGrade.score.toString() : "",
          saved: !!existingGrade,
        };
      });
    });
    setGradeEntries(entries);
    setLoading(false);
  }

  const handleScoreChange = (studentId: string, taskId: string, value: string) => {
    const key = `${studentId}-${taskId}`;
    setGradeEntries((prev) => ({
      ...prev,
      [key]: { ...prev[key], score: value, saved: false },
    }));
  };

  const handleSaveGrade = async (studentId: string, taskId: string) => {
    const key = `${studentId}-${taskId}`;
    const entry = gradeEntries[key];
    const task = tasks.find((t) => t.id === taskId);

    if (!task) return;

    const score = parseFloat(entry.score);
    if (entry.score === "" || isNaN(score) || score < 0 || score > task.maxScore) {
      toast.error(`Score must be between 0 and ${task.maxScore}`);
      return;
    }

    setSaving((prev) => ({ ...prev, [key]: true }));

    try {
      await upsertGrade(studentId, taskId, score);
      setGradeEntries((prev) => ({
        ...prev,
        [key]: { ...prev[key], saved: true },
      }));
      toast.success("Grade saved");
    } catch (error) {
      toast.error("Failed to save grade");
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const getStudentAverage = (studentId: string) => {
    const studentGrades = Object.entries(gradeEntries)
      .filter(([key, entry]) => key.startsWith(studentId) && entry.saved && entry.score !== "")
      .map(([key, entry]) => {
        const taskId = key.split("-")[1];
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return null;
        return (parseFloat(entry.score) / task.maxScore) * 100;
      })
      .filter((v): v is number => v !== null);

    if (studentGrades.length === 0) return null;
    return Math.round(studentGrades.reduce((a, b) => a + b, 0) / studentGrades.length);
  };

  const filteredTasks =
    selectedTask === "all"
      ? tasks
      : tasks.filter((t) => t.id === selectedTask);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-lg text-muted-foreground">
            Add students first to start grading.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-lg text-muted-foreground">
            Create tasks first to start grading.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select value={selectedTask} onValueChange={setSelectedTask}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filter by task" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            {tasks.map((task) => (
              <SelectItem key={task.id} value={task.id}>
                {task.title} ({task.maxScore} pts)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-none shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="sticky left-0 z-10 bg-card min-w-[200px]">
                  Student
                </TableHead>
                {filteredTasks.map((task) => (
                  <TableHead key={task.id} className="text-center min-w-[140px]">
                    <div className="flex flex-col">
                      <span className="font-medium">{task.title}</span>
                      <span className="text-xs text-muted-foreground">
                        / {task.maxScore}
                      </span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-center min-w-[100px]">Average</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="sticky left-0 z-10 bg-card">
                    <div className="flex items-center gap-3">
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
                      <span className="font-medium text-foreground">
                        {student.name}
                      </span>
                    </div>
                  </TableCell>
                  {filteredTasks.map((task) => {
                    const key = `${student.id}-${task.id}`;
                    const entry = gradeEntries[key];
                    const isSaving = saving[key];
                    return (
                      <TableCell key={task.id} className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max={task.maxScore}
                            value={entry?.score || ""}
                            onChange={(e) =>
                              handleScoreChange(student.id, task.id, e.target.value)
                            }
                            className="w-20 text-center"
                            placeholder="-"
                          />
                          <Button
                            size="icon"
                            variant={entry?.saved ? "ghost" : "default"}
                            className="h-8 w-8"
                            onClick={() => handleSaveGrade(student.id, task.id)}
                            disabled={isSaving || !entry?.score}
                          >
                            {entry?.saved ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">
                    <span className="font-semibold text-foreground">
                      {getStudentAverage(student.id) !== null
                        ? `${getStudentAverage(student.id)}%`
                        : "-"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
