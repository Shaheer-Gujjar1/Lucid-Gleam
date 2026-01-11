import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { getStudentsByClass, getTasksByClass, getAllGrades, getAttendanceByClass, Student, Task, Grade, Attendance } from "@/lib/db";
import { TrendingUp, TrendingDown, Award, Calendar, Target, BookOpen } from "lucide-react";
import { StudentSearchCombobox } from "./StudentSearchCombobox";

interface StudentPerformanceProps {
  classId: string;
  initialStudentId?: string;
}

export function StudentPerformance({ classId, initialStudentId }: StudentPerformanceProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      const [s, t, allGrades, att] = await Promise.all([
        getStudentsByClass(classId),
        getTasksByClass(classId),
        getAllGrades(),
        getAttendanceByClass(classId),
      ]);
      setStudents(s);
      setTasks(t);
      setAttendance(att);
      
      const studentIds = new Set(s.map((st) => st.id));
      const taskIds = new Set(t.map((tk) => tk.id));
      const classGrades = allGrades.filter(
        (g) => studentIds.has(g.studentId) && taskIds.has(g.taskId)
      );
      setGrades(classGrades);
      
      if (s.length > 0) {
        // Use initialStudentId if provided and valid, otherwise use first student
        const targetStudent = initialStudentId && s.some(st => st.id === initialStudentId) 
          ? initialStudentId 
          : s[0].id;
        setSelectedStudent(targetStudent);
      }
      setLoading(false);
    }
    loadData();
  }, [classId]);

  const getStudentStats = (studentId: string) => {
    const studentGrades = grades.filter((g) => g.studentId === studentId);
    const studentAttendance = attendance.filter((a) => a.studentId === studentId);
    // Only count tasks that have maxScore
    const gradableTasks = tasks.filter(t => t.maxScore);

    if (studentGrades.length === 0) {
      return { average: 0, completed: 0, total: gradableTasks.length, attendance: 0, trend: "stable" as const };
    }

    const percentages = studentGrades.map((g) => {
      const task = tasks.find((t) => t.id === g.taskId);
      return task && task.maxScore ? (g.score / task.maxScore) * 100 : 0;
    }).filter(p => p > 0);

    const average = percentages.reduce((a, b) => a + b, 0) / percentages.length;
    const presentDays = studentAttendance.filter((a) => a.status === "present" || a.status === "late").length;
    const attendanceRate = studentAttendance.length > 0 ? (presentDays / studentAttendance.length) * 100 : 100;

    // Calculate trend
    let trend: "up" | "down" | "stable" = "stable";
    if (percentages.length >= 2) {
      const recent = percentages.slice(-2);
      if (recent[1] > recent[0] + 5) trend = "up";
      else if (recent[1] < recent[0] - 5) trend = "down";
    }

    return { 
      average: Math.round(average), 
      completed: studentGrades.length, 
      total: gradableTasks.length,
      attendance: Math.round(attendanceRate),
      trend
    };
  };

  const getTaskPerformance = (studentId: string) => {
    // Only show tasks with maxScore for performance tracking
    return tasks.filter(t => t.maxScore).map((task) => {
      const grade = grades.find((g) => g.taskId === task.id && g.studentId === studentId);
      const percentage = grade && task.maxScore ? (grade.score / task.maxScore) * 100 : null;
      return {
        name: task.title.substring(0, 15),
        score: percentage !== null ? Math.round(percentage) : null,
        type: task.type,
      };
    });
  };

  const getRadarData = (studentId: string) => {
    const taskTypes = ["assignment", "quiz", "presentation", "project", "other"];
    return taskTypes.map((type) => {
      const typeTasks = tasks.filter((t) => t.type === type && t.maxScore);
      const typeGrades = grades.filter(
        (g) => g.studentId === studentId && typeTasks.some((t) => t.id === g.taskId)
      );

      if (typeGrades.length === 0) return { subject: type, A: 0, fullMark: 100 };

      const avg = typeGrades.reduce((sum, g) => {
        const task = tasks.find((t) => t.id === g.taskId);
        return task && task.maxScore ? sum + (g.score / task.maxScore) * 100 : sum;
      }, 0) / typeGrades.length;

      return { subject: type.charAt(0).toUpperCase() + type.slice(1), A: Math.round(avg), fullMark: 100 };
    });
  };

  const getGradeLabel = (percentage: number) => {
    if (percentage >= 90) return { grade: "A", color: "bg-chart-1/20 text-chart-1" };
    if (percentage >= 80) return { grade: "B", color: "bg-chart-2/20 text-chart-2" };
    if (percentage >= 70) return { grade: "C", color: "bg-chart-3/20 text-chart-3" };
    if (percentage >= 60) return { grade: "D", color: "bg-chart-4/20 text-chart-4" };
    return { grade: "F", color: "bg-destructive/20 text-destructive" };
  };

  const selectedStudentData = students.find((s) => s.id === selectedStudent);
  const stats = selectedStudent ? getStudentStats(selectedStudent) : null;

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
          <p className="text-lg text-muted-foreground">No students yet. Add students to track their performance!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Student Performance</h2>
        <StudentSearchCombobox
          students={students}
          value={selectedStudent}
          onValueChange={setSelectedStudent}
          placeholder="Select a student"
          className="w-64"
        />
      </div>

      {selectedStudentData && stats && (
        <>
          <Card className="border-none shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                {selectedStudentData.photo ? (
                  <img
                    src={selectedStudentData.photo}
                    alt={selectedStudentData.name}
                    className="h-20 w-20 rounded-full object-cover ring-4 ring-primary/20"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
                    {selectedStudentData.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-card-foreground">{selectedStudentData.name}</h3>
                  {selectedStudentData.email && (
                    <p className="text-muted-foreground">{selectedStudentData.email}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    {stats.average > 0 && (
                      <Badge className={getGradeLabel(stats.average).color}>
                        Grade {getGradeLabel(stats.average).grade}
                      </Badge>
                    )}
                    {stats.trend === "up" && (
                      <Badge variant="outline" className="gap-1 text-chart-1 border-chart-1">
                        <TrendingUp className="h-3 w-3" /> Improving
                      </Badge>
                    )}
                    {stats.trend === "down" && (
                      <Badge variant="outline" className="gap-1 text-destructive border-destructive">
                        <TrendingDown className="h-3 w-3" /> Needs Attention
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
                <Target className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-card-foreground">{stats.average}%</div>
                <Progress value={stats.average} className="mt-2" />
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tasks Completed</CardTitle>
                <BookOpen className="h-5 w-5 text-chart-2" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-card-foreground">
                  {stats.completed}/{stats.total}
                </div>
                <Progress value={(stats.completed / Math.max(stats.total, 1)) * 100} className="mt-2" />
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Attendance</CardTitle>
                <Calendar className="h-5 w-5 text-chart-3" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-card-foreground">{stats.attendance}%</div>
                <Progress value={stats.attendance} className="mt-2" />
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Class Rank</CardTitle>
                <Award className="h-5 w-5 text-chart-4" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-card-foreground">
                  #{students
                    .map((s) => ({ id: s.id, avg: getStudentStats(s.id).average }))
                    .sort((a, b) => b.avg - a.avg)
                    .findIndex((s) => s.id === selectedStudent) + 1}
                </div>
                <p className="text-sm text-muted-foreground mt-1">of {students.length} students</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-card-foreground">Score Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getTaskPerformance(selectedStudent).filter((t) => t.score !== null)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }} 
                    />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))" }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-card-foreground">Performance by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={getRadarData(selectedStudent)}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                    <Radar name="Score" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-card-foreground">All Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasks.filter(t => t.maxScore).map((task) => {
                  const grade = grades.find((g) => g.taskId === task.id && g.studentId === selectedStudent);
                  const percentage = grade && task.maxScore ? Math.round((grade.score / task.maxScore) * 100) : null;

                  return (
                    <div key={task.id} className="flex items-center justify-between rounded-lg bg-background p-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="capitalize">{task.type}</Badge>
                        <span className="font-medium text-foreground">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {percentage !== null ? (
                          <>
                            <span className="text-muted-foreground">
                              {grade?.score}/{task.maxScore}
                            </span>
                            <Badge className={getGradeLabel(percentage).color}>
                              {percentage}%
                            </Badge>
                          </>
                        ) : (
                          <Badge variant="secondary">Not Graded</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}