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
import { ChevronLeft, ChevronRight, Calendar, Clock, BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Student,
  Attendance,
  getStudentsByClass,
  getAttendanceByDate,
  upsertAttendance,
  getLecturesForDate,
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

const LECTURE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

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

function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function ClassAttendance({ classId }: ClassAttendanceProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()));
  const [selectedLecture, setSelectedLecture] = useState<number>(1);
  const [lectureTime, setLectureTime] = useState<string>(getCurrentTime());
  const [existingLectures, setExistingLectures] = useState<number[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Attendance["status"]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadStudents();
  }, [classId]);

  useEffect(() => {
    if (students.length > 0) {
      loadLecturesAndAttendance();
    }
  }, [selectedDate, students]);

  useEffect(() => {
    if (students.length > 0) {
      loadAttendance();
    }
  }, [selectedLecture]);

  async function loadStudents() {
    const data = await getStudentsByClass(classId);
    setStudents(data.sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  }

  async function loadLecturesAndAttendance() {
    const lectures = await getLecturesForDate(classId, selectedDate);
    setExistingLectures(lectures);
    
    // Auto-select first existing lecture or default to 1
    if (lectures.length > 0 && !lectures.includes(selectedLecture)) {
      setSelectedLecture(lectures[0]);
    }
    
    await loadAttendance();
  }

  async function loadAttendance() {
    const records = await getAttendanceByDate(classId, selectedDate, selectedLecture);
    const map: Record<string, Attendance["status"]> = {};
    records.forEach(r => {
      map[r.studentId] = r.status;
    });
    setAttendance(map);
    
    // Set time from first record if exists
    if (records.length > 0 && records[0].time) {
      setLectureTime(records[0].time);
    }
  }

  const handleStatusChange = async (studentId: string, status: Attendance["status"]) => {
    setSaving(prev => ({ ...prev, [studentId]: true }));
    setAttendance(prev => ({ ...prev, [studentId]: status }));
    
    try {
      await upsertAttendance(classId, studentId, selectedDate, selectedLecture, status, lectureTime);
      
      // Refresh existing lectures list
      const lectures = await getLecturesForDate(classId, selectedDate);
      setExistingLectures(lectures);
      
      toast.success("Attendance saved");
    } catch (error) {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const markAllPresent = async () => {
    for (const student of students) {
      await upsertAttendance(classId, student.id, selectedDate, selectedLecture, "present", lectureTime);
    }
    await loadAttendance();
    
    // Refresh existing lectures list
    const lectures = await getLecturesForDate(classId, selectedDate);
    setExistingLectures(lectures);
    
    toast.success("All students marked present");
  };

  const startNewLecture = () => {
    // Find next available lecture number
    const nextLecture = LECTURE_OPTIONS.find(l => !existingLectures.includes(l)) || selectedLecture + 1;
    setSelectedLecture(nextLecture);
    setLectureTime(getCurrentTime());
    setAttendance({});
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(formatDateForInput(date));
    setSelectedLecture(1);
    setLectureTime(getCurrentTime());
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
      {/* Date & Lecture Navigation */}
      <div className="flex flex-col gap-4">
        {/* Date Row */}
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

        {/* Lecture & Time Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Lecture Selector */}
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <Select
                value={String(selectedLecture)}
                onValueChange={(v) => setSelectedLecture(Number(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Lecture" />
                </SelectTrigger>
                <SelectContent>
                  {LECTURE_OPTIONS.map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      Lecture {num}
                      {existingLectures.includes(num) && " ✓"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Input */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={lectureTime}
                onChange={(e) => setLectureTime(e.target.value)}
                className="w-[120px]"
              />
            </div>

            {/* Existing Lectures Indicator */}
            {existingLectures.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Recorded:</span>
                {existingLectures.map((l) => (
                  <Button
                    key={l}
                    variant={l === selectedLecture ? "default" : "outline"}
                    size="sm"
                    className="h-6 w-6 p-0 text-xs"
                    onClick={() => setSelectedLecture(l)}
                  >
                    {l}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* New Lecture Button */}
          <Button variant="outline" onClick={startNewLecture} className="gap-2">
            <Plus className="h-4 w-4" />
            New Lecture
          </Button>
        </div>
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
          <CardTitle className="text-card-foreground flex items-center gap-2">
            <span>{formatDateDisplay(selectedDate)}</span>
            <span className="text-sm font-normal text-muted-foreground">
              • Lecture {selectedLecture} {lectureTime && `at ${lectureTime}`}
            </span>
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