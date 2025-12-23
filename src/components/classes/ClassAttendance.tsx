import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
  Student,
  Attendance,
  getStudentsByClass,
  getAttendanceByDate,
  upsertAttendance,
} from "@/lib/db";

interface ClassAttendanceProps {
  classId: string;
}

const STATUS_OPTIONS: { value: Attendance["status"]; label: string; color: string }[] = [
  { value: "present", label: "Present", color: "bg-chart-1/20 text-accent-foreground" },
  { value: "absent", label: "Absent", color: "bg-destructive/20 text-destructive" },
  { value: "late", label: "Late", color: "bg-chart-3/20 text-accent-foreground" },
  { value: "excused", label: "Excused", color: "bg-muted text-muted-foreground" },
];

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ClassAttendance({ classId }: ClassAttendanceProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()));
  const [attendance, setAttendance] = useState<Record<string, Attendance["status"]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadStudents();
  }, [classId]);

  useEffect(() => {
    if (students.length > 0) {
      loadAttendance();
    }
  }, [selectedDate, students]);

  async function loadStudents() {
    const data = await getStudentsByClass(classId);
    setStudents(data.sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  }

  async function loadAttendance() {
    const records = await getAttendanceByDate(classId, selectedDate);
    const map: Record<string, Attendance["status"]> = {};
    records.forEach(r => {
      map[r.studentId] = r.status;
    });
    setAttendance(map);
  }

  const handleStatusChange = async (studentId: string, status: Attendance["status"]) => {
    setSaving(prev => ({ ...prev, [studentId]: true }));
    setAttendance(prev => ({ ...prev, [studentId]: status }));
    
    try {
      await upsertAttendance(classId, studentId, selectedDate, status);
      toast.success("Attendance saved");
    } catch (error) {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const markAllPresent = async () => {
    for (const student of students) {
      await upsertAttendance(classId, student.id, selectedDate, "present");
    }
    await loadAttendance();
    toast.success("All students marked present");
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(formatDateForInput(date));
  };

  const getStatusColor = (status?: Attendance["status"]) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || "bg-muted";
  };

  const getStats = () => {
    const total = students.length;
    const present = Object.values(attendance).filter(s => s === "present").length;
    const absent = Object.values(attendance).filter(s => s === "absent").length;
    const late = Object.values(attendance).filter(s => s === "late").length;
    const excused = Object.values(attendance).filter(s => s === "excused").length;
    const unmarked = total - present - absent - late - excused;
    return { total, present, absent, late, excused, unmarked };
  };

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
            Add students first to track attendance.
          </p>
        </CardContent>
      </Card>
    );
  }

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={markAllPresent}>Mark All Present</Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-5">
        <Card className="border-none shadow">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.present}</p>
            <p className="text-xs text-muted-foreground">Present</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.absent}</p>
            <p className="text-xs text-muted-foreground">Absent</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.late}</p>
            <p className="text-xs text-muted-foreground">Late</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.excused}</p>
            <p className="text-xs text-muted-foreground">Excused</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.unmarked}</p>
            <p className="text-xs text-muted-foreground">Unmarked</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-card-foreground">
            {formatDateDisplay(selectedDate)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="w-[160px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const status = attendance[student.id];
                const isSaving = saving[student.id];
                return (
                  <TableRow key={student.id}>
                    <TableCell>
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
                        <span className="font-medium text-foreground">{student.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={status || ""}
                        onValueChange={(value) => handleStatusChange(student.id, value as Attendance["status"])}
                        disabled={isSaving}
                      >
                        <SelectTrigger className={`w-[140px] ${status ? getStatusColor(status) : ""}`}>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}