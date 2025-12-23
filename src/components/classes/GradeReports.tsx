import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { getStudentsByClass, getTasksByClass, getAllGrades, Student, Task, Grade } from "@/lib/db";
import { TrendingUp, TrendingDown, Target, Award } from "lucide-react";

interface GradeReportsProps {
  classId: string;
}

export function GradeReports({ classId }: GradeReportsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<string>("all");

  useEffect(() => {
    async function loadData() {
      const [s, t, allGrades] = await Promise.all([
        getStudentsByClass(classId),
        getTasksByClass(classId),
        getAllGrades(),
      ]);
      setStudents(s);
      setTasks(t);
      
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

  const getFilteredGrades = () => {
    if (selectedTask === "all") return grades;
    return grades.filter((g) => g.taskId === selectedTask);
  };

  const calculateStats = () => {
    const filteredGrades = getFilteredGrades();
    if (filteredGrades.length === 0) return { avg: 0, highest: 0, lowest: 0, passing: 0 };

    const percentages = filteredGrades.map((g) => {
      const task = tasks.find((t) => t.id === g.taskId);
      return task ? (g.score / task.maxScore) * 100 : 0;
    });

    const avg = percentages.reduce((a, b) => a + b, 0) / percentages.length;
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    const passing = (percentages.filter((p) => p >= 50).length / percentages.length) * 100;

    return { avg: Math.round(avg), highest: Math.round(highest), lowest: Math.round(lowest), passing: Math.round(passing) };
  };

  const getGradeDistribution = () => {
    const filteredGrades = getFilteredGrades();
    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };

    filteredGrades.forEach((g) => {
      const task = tasks.find((t) => t.id === g.taskId);
      if (!task) return;
      const percentage = (g.score / task.maxScore) * 100;

      if (percentage >= 90) distribution.A++;
      else if (percentage >= 80) distribution.B++;
      else if (percentage >= 70) distribution.C++;
      else if (percentage >= 60) distribution.D++;
      else distribution.F++;
    });

    return Object.entries(distribution).map(([grade, count]) => ({
      name: grade,
      value: count,
    }));
  };

  const getStudentPerformance = () => {
    return students.map((student) => {
      const studentGrades = getFilteredGrades().filter((g) => g.studentId === student.id);
      if (studentGrades.length === 0) return { name: student.name.split(" ")[0], average: 0 };

      const avg = studentGrades.reduce((sum, g) => {
        const task = tasks.find((t) => t.id === g.taskId);
        return task ? sum + (g.score / task.maxScore) * 100 : sum;
      }, 0) / studentGrades.length;

      return { name: student.name.split(" ")[0], average: Math.round(avg) };
    }).sort((a, b) => b.average - a.average);
  };

  const getTaskTrends = () => {
    return tasks.map((task) => {
      const taskGrades = grades.filter((g) => g.taskId === task.id);
      if (taskGrades.length === 0) return { name: task.title.substring(0, 10), average: 0 };

      const avg = taskGrades.reduce((sum, g) => sum + (g.score / task.maxScore) * 100, 0) / taskGrades.length;
      return { name: task.title.substring(0, 10), average: Math.round(avg) };
    });
  };

  const stats = calculateStats();
  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (grades.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-lg text-muted-foreground">No grades yet. Start grading tasks to see reports!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Grade Analytics</h2>
        <Select value={selectedTask} onValueChange={setSelectedTask}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by task" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            {tasks.map((task) => (
              <SelectItem key={task.id} value={task.id}>
                {task.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Class Average</CardTitle>
            <Target className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-card-foreground">{stats.avg}%</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Highest Score</CardTitle>
            <TrendingUp className="h-5 w-5 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-card-foreground">{stats.highest}%</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lowest Score</CardTitle>
            <TrendingDown className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-card-foreground">{stats.lowest}%</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pass Rate</CardTitle>
            <Award className="h-5 w-5 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-card-foreground">{stats.passing}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-card-foreground">Student Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getStudentPerformance().slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" width={80} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }} 
                />
                <Bar dataKey="average" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-card-foreground">Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getGradeDistribution()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {getGradeDistribution().map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-card-foreground">Performance Trend by Task</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getTaskTrends()}>
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
                <Line type="monotone" dataKey="average" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}