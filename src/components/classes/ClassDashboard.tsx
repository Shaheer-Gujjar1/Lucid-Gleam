import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, GraduationCap, TrendingUp, FileSpreadsheet, Award, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  getStudentsByClass,
  getTasksByClass,
  getAllGrades,
  getAttendanceByClass,
  getBehaviourByClass,
  Student,
  Task,
  Grade,
  Attendance,
  Behaviour,
  BehaviourRating,
} from "@/lib/db";

interface ClassDashboardProps {
  classId: string;
}

const BEHAVIOUR_VALUES: Record<BehaviourRating, number> = {
  excellent: 5,
  good: 4,
  satisfactory: 3,
  needs_improvement: 2,
  poor: 1,
};

const STORAGE_KEY = "markssheet-config";

interface MarksSheetConfig {
  id: string;
  name: string;
  sessional: {
    usePercentage: boolean;
    columns: Array<{
      id: string;
      name: string;
      maxMarks: number;
      type: "auto" | "manual";
      autoSource?: "attendance" | "behaviour" | "assignments" | "quizzes" | "presentations" | "projects";
    }>;
  };
  exams: Array<{
    id: string;
    name: string;
    maxMarks: number;
  }>;
  totalMaxMarks: number;
}

export function ClassDashboard({ classId }: ClassDashboardProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [behaviour, setBehaviour] = useState<Behaviour[]>([]);
  const [loading, setLoading] = useState(true);
  const [marksSummary, setMarksSummary] = useState<{
    classAverage: number;
    highest: number;
    lowest: number;
    passRate: number;
    maxTotal: number;
    templateName: string;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      const [s, t, allGrades, att, beh] = await Promise.all([
        getStudentsByClass(classId),
        getTasksByClass(classId),
        getAllGrades(),
        getAttendanceByClass(classId),
        getBehaviourByClass(classId),
      ]);
      setStudents(s);
      setTasks(t);
      setAttendance(att);
      setBehaviour(beh);
      
      // Filter grades for this class's students and tasks
      const studentIds = new Set(s.map((st) => st.id));
      const taskIds = new Set(t.map((tk) => tk.id));
      const classGrades = allGrades.filter(
        (g) => studentIds.has(g.studentId) && taskIds.has(g.taskId)
      );
      setGrades(classGrades);

      // Load marks sheet config and calculate summary
      loadMarksSummary(s, t, classGrades, att, beh);
      
      setLoading(false);
    }
    loadData();
  }, [classId]);

  const loadMarksSummary = useCallback((
    studentsData: Student[],
    tasksData: Task[],
    gradesData: Grade[],
    attendanceData: Attendance[],
    behaviourData: Behaviour[]
  ) => {
    const saved = localStorage.getItem(`${STORAGE_KEY}-${classId}`);
    if (!saved || studentsData.length === 0) {
      setMarksSummary(null);
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      const config: MarksSheetConfig = parsed.config;
      const manualMarks: Record<string, Record<string, number>> = parsed.manualMarks || {};

      const maxSessional = config.sessional.columns.reduce((sum, c) => sum + c.maxMarks, 0);
      const maxExam = config.exams.reduce((sum, e) => sum + e.maxMarks, 0);
      const maxTotal = maxSessional + maxExam;

      // Calculate auto marks for each student
      const calculateAutoMarks = (studentId: string, column: typeof config.sessional.columns[0]): number => {
        if (column.type === "manual") return 0;
        
        switch (column.autoSource) {
          case "attendance": {
            const studentAttendance = attendanceData.filter(a => a.studentId === studentId);
            if (studentAttendance.length === 0) return 0;
            const presentCount = studentAttendance.filter(a => a.status === "present" || a.status === "late").length;
            const rate = presentCount / studentAttendance.length;
            return Math.round(rate * column.maxMarks * 10) / 10;
          }
          case "behaviour": {
            const studentBehaviour = behaviourData.filter(b => b.studentId === studentId);
            if (studentBehaviour.length === 0) return 0;
            const total = studentBehaviour.reduce((sum, b) => sum + BEHAVIOUR_VALUES[b.rating], 0);
            const avg = total / studentBehaviour.length;
            return Math.round((avg / 5) * column.maxMarks * 10) / 10;
          }
          case "assignments":
          case "quizzes":
          case "presentations":
          case "projects": {
            const typeMap: Record<string, string> = {
              assignments: "assignment",
              quizzes: "quiz",
              presentations: "presentation",
              projects: "project"
            };
            const taskType = typeMap[column.autoSource];
            const typeTasks = tasksData.filter(t => t.type === taskType && t.includeInMarksSheet);
            if (typeTasks.length === 0) return 0;
            const studentGrades = gradesData.filter(g => 
              g.studentId === studentId && 
              typeTasks.some(t => t.id === g.taskId)
            );
            if (studentGrades.length === 0) return 0;
            const totalMax = typeTasks.reduce((sum, t) => sum + t.maxScore, 0);
            const totalScore = studentGrades.reduce((sum, g) => {
              const task = typeTasks.find(t => t.id === g.taskId);
              return sum + (g.score / (task?.maxScore || 1)) * (task?.maxScore || 0);
            }, 0);
            return Math.round((totalScore / totalMax) * column.maxMarks * 10) / 10;
          }
          default:
            return 0;
        }
      };

      // Calculate totals for each student
      const studentTotals = studentsData.map(student => {
        let sessionalTotal = 0;
        let examTotal = 0;

        config.sessional.columns.forEach(col => {
          if (col.type === "auto") {
            sessionalTotal += calculateAutoMarks(student.id, col);
          } else {
            sessionalTotal += manualMarks[student.id]?.[col.id] || 0;
          }
        });

        config.exams.forEach(exam => {
          examTotal += manualMarks[student.id]?.[exam.id] || 0;
        });

        return sessionalTotal + examTotal;
      });

      const classAverage = studentTotals.reduce((sum, t) => sum + t, 0) / studentsData.length;
      const highest = Math.max(...studentTotals);
      const lowest = Math.min(...studentTotals);
      const passCount = studentTotals.filter(t => (t / maxTotal) * 100 >= 50).length;

      setMarksSummary({
        classAverage,
        highest,
        lowest,
        passRate: Math.round((passCount / studentsData.length) * 100),
        maxTotal,
        templateName: config.name
      });
    } catch (e) {
      console.error("Failed to load marks summary", e);
      setMarksSummary(null);
    }
  }, [classId]);

  const calculateAverageScore = () => {
    // Only include tasks with includeInMarksSheet
    const gradableTasks = tasks.filter(t => t.includeInMarksSheet);
    const relevantGrades = grades.filter(g => gradableTasks.some(t => t.id === g.taskId));
    if (relevantGrades.length === 0 || gradableTasks.length === 0) return 0;
    const totalPercentage = relevantGrades.reduce((sum, grade) => {
      const task = gradableTasks.find((t) => t.id === grade.taskId);
      if (!task) return sum;
      return sum + (grade.score / task.maxScore) * 100;
    }, 0);
    return Math.round(totalPercentage / relevantGrades.length);
  };

  const recentTasks = tasks
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const taskTypeColors: Record<string, string> = {
    assignment: "bg-chart-1/20 text-accent-foreground",
    quiz: "bg-chart-2/20 text-accent-foreground",
    presentation: "bg-chart-3/20 text-accent-foreground",
    project: "bg-chart-4/20 text-accent-foreground",
    other: "bg-muted text-muted-foreground",
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Students
            </CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-card-foreground">{students.length}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasks
            </CardTitle>
            <ClipboardList className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-card-foreground">{tasks.length}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Grades Given
            </CardTitle>
            <GraduationCap className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-card-foreground">{grades.length}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Class Average
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-card-foreground">
              {calculateAverageScore()}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Marks Sheet Summary */}
      {marksSummary && (
        <Card className="border-none shadow-lg bg-gradient-to-br from-primary/5 to-chart-2/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <FileSpreadsheet className="h-5 w-5" />
                Marks Sheet Summary
              </CardTitle>
              <Badge variant="secondary">{marksSummary.templateName}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Class Average</span>
                  <span className="font-bold">{marksSummary.classAverage.toFixed(1)}/{marksSummary.maxTotal}</span>
                </div>
                <Progress 
                  value={(marksSummary.classAverage / marksSummary.maxTotal) * 100} 
                  className="h-2"
                />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-chart-1/10">
                <Award className="h-8 w-8 text-chart-1" />
                <div>
                  <p className="text-xs text-muted-foreground">Highest Score</p>
                  <p className="text-xl font-bold text-chart-1">{marksSummary.highest}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-chart-3/10">
                <AlertTriangle className="h-8 w-8 text-chart-3" />
                <div>
                  <p className="text-xs text-muted-foreground">Lowest Score</p>
                  <p className="text-xl font-bold text-chart-3">{marksSummary.lowest}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-chart-2/10">
                <TrendingUp className="h-8 w-8 text-chart-2" />
                <div>
                  <p className="text-xs text-muted-foreground">Pass Rate</p>
                  <p className="text-xl font-bold text-chart-2">{marksSummary.passRate}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-card-foreground">Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No tasks yet. Create your first task!
              </p>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-lg bg-background p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                          taskTypeColors[task.type]
                        }`}
                      >
                        {task.type}
                      </span>
                      <span className="font-medium text-foreground">{task.title}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Max: {task.maxScore}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-card-foreground">Students</CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No students yet. Add your first student!
              </p>
            ) : (
              <div className="space-y-3">
                {students.slice(0, 5).map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 rounded-lg bg-background p-3"
                  >
                    {student.photo ? (
                      <img
                        src={student.photo}
                        alt={student.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-foreground">{student.name}</p>
                      {student.email && (
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      )}
                    </div>
                  </div>
                ))}
                {students.length > 5 && (
                  <p className="text-center text-sm text-muted-foreground">
                    +{students.length - 5} more students
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
