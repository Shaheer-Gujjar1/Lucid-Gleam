import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, GraduationCap, TrendingUp } from "lucide-react";
import {
  getStudentsByClass,
  getTasksByClass,
  getAllGrades,
  Student,
  Task,
  Grade,
} from "@/lib/db";

interface ClassDashboardProps {
  classId: string;
}

export function ClassDashboard({ classId }: ClassDashboardProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [s, t, allGrades] = await Promise.all([
        getStudentsByClass(classId),
        getTasksByClass(classId),
        getAllGrades(),
      ]);
      setStudents(s);
      setTasks(t);
      
      // Filter grades for this class's students and tasks
      const studentIds = new Set(s.map((st) => st.id));
      const taskIds = new Set(t.map((tk) => tk.id));
      const classGrades = allGrades.filter(
        (g) => studentIds.has(g.studentId) && taskIds.has(g.taskId)
      );
      setGrades(classGrades);
      setLoading(false);
    }
    loadData();
  }, [classId]);

  const calculateAverageScore = () => {
    if (grades.length === 0 || tasks.length === 0) return 0;
    const totalPercentage = grades.reduce((sum, grade) => {
      const task = tasks.find((t) => t.id === grade.taskId);
      if (!task) return sum;
      return sum + (grade.score / task.maxScore) * 100;
    }, 0);
    return Math.round(totalPercentage / grades.length);
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
