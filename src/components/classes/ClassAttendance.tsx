import { useEffect, useState, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, Clock, BookOpen, Plus, AlertCircle, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Student,
  Attendance,
  Class,
  ClassSubject,
  LecturePeriod,
  getStudentsByClass,
  getAttendanceByDate,
  upsertAttendance,
  getLecturesForDate,
  getClass,
} from "@/lib/db";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// Helper to get attendance save key for localStorage
function getAttendanceSaveKey(classId: string, date: string, lecture: number, subjectId?: string): string {
  return `attendance_saved_${classId}_${date}_${lecture}_${subjectId || 'all'}`;
}

export function ClassAttendance({ classId }: ClassAttendanceProps) {
  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()));
  const [selectedLecture, setSelectedLecture] = useState<number>(1);
  const [selectedSubject, setSelectedSubject] = useState<ClassSubject | null>(null);
  const [lectureTime, setLectureTime] = useState<string>(getCurrentTime());
  const [existingLectures, setExistingLectures] = useState<number[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Attendance["status"]>>({});
  const [savedAttendance, setSavedAttendance] = useState<Record<string, Attendance["status"]>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showChangeWarning, setShowChangeWarning] = useState(false);

  // Derived values from schedule
  const subjects = classData?.subjects || [];
  const hasSubjects = subjects.length > 0;
  const lecturePeriods = classData?.lecturePeriods || [];
  const lectureCount = lecturePeriods.length; // Only use configured lectures from schedule
  const hasSchedule = lectureCount > 0;

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify(attendance) !== JSON.stringify(savedAttendance);

  useEffect(() => {
    loadInitialData();
  }, [classId]);

  useEffect(() => {
    if (students.length > 0 && classData) {
      loadLecturesAndAttendance();
    }
  }, [selectedDate, students, classData]);

  useEffect(() => {
    if (students.length > 0 && classData) {
      loadAttendance();
    }
  }, [selectedLecture, selectedSubject]);

  async function loadInitialData() {
    const [studentsData, classInfo] = await Promise.all([
      getStudentsByClass(classId),
      getClass(classId),
    ]);
    
    setStudents(studentsData.sort((a, b) => a.name.localeCompare(b.name)));
    setClassData(classInfo || null);
    
    // Auto-select first subject if available
    if (classInfo?.subjects && classInfo.subjects.length > 0) {
      setSelectedSubject(classInfo.subjects[0]);
    }
    
    // Set initial lecture time from schedule if available
    if (classInfo?.lecturePeriods && classInfo.lecturePeriods.length > 0) {
      setLectureTime(classInfo.lecturePeriods[0].startTime);
    }
    
    setLoading(false);
  }

  async function loadLecturesAndAttendance() {
    const lectures = await getLecturesForDate(classId, selectedDate, selectedSubject?.id);
    setExistingLectures(lectures);
    
    // Auto-select first existing lecture or default to 1
    if (lectures.length > 0 && !lectures.includes(selectedLecture)) {
      setSelectedLecture(lectures[0]);
    }
    
    await loadAttendance();
  }

  async function loadAttendance() {
    const records = await getAttendanceByDate(classId, selectedDate, selectedLecture, selectedSubject?.id);
    const map: Record<string, Attendance["status"]> = {};
    records.forEach(r => {
      map[r.studentId] = r.status;
    });
    setAttendance(map);
    setSavedAttendance(map);
    
    // Check both IndexedDB records AND localStorage for saved state
    const saveKey = getAttendanceSaveKey(classId, selectedDate, selectedLecture, selectedSubject?.id);
    const savedInStorage = localStorage.getItem(saveKey) === 'true';
    setIsSaved(records.length > 0 || savedInStorage);
    
    // Set time from first record if exists, or from schedule
    if (records.length > 0 && records[0].time) {
      setLectureTime(records[0].time);
    } else if (lecturePeriods[selectedLecture - 1]) {
      setLectureTime(lecturePeriods[selectedLecture - 1].startTime);
    }
  }

  const handleStatusChange = (studentId: string, status: Attendance["status"]) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveClick = () => {
    // If already saved and there are changes, show warning first
    if (isSaved && hasChanges) {
      setShowChangeWarning(true);
      return;
    }
    saveAttendance();
  };

  const confirmChange = () => {
    setShowChangeWarning(false);
    saveAttendance();
  };

  const saveAttendance = async () => {
    setSaving(true);
    
    try {
      for (const student of students) {
        const status = attendance[student.id];
        if (status) {
          await upsertAttendance(
            classId, 
            student.id, 
            selectedDate, 
            selectedLecture, 
            status, 
            lectureTime,
            selectedSubject?.id,
            selectedSubject?.name
          );
        }
      }
      
      // Refresh existing lectures list
      const lectures = await getLecturesForDate(classId, selectedDate, selectedSubject?.id);
      setExistingLectures(lectures);
      
      // Persist saved state to localStorage
      const saveKey = getAttendanceSaveKey(classId, selectedDate, selectedLecture, selectedSubject?.id);
      localStorage.setItem(saveKey, 'true');
      
      setSavedAttendance({ ...attendance });
      setIsSaved(true);
      toast.success("Attendance saved successfully");
    } catch (error) {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = () => {
    const newAttendance: Record<string, Attendance["status"]> = {};
    students.forEach(student => {
      // If already saved with a different status, keep the saved status
      if (isSaved && savedAttendance[student.id]) {
        newAttendance[student.id] = savedAttendance[student.id];
      } else {
        newAttendance[student.id] = "present";
      }
    });
    setAttendance(newAttendance);
  };

  const startNewLecture = () => {
    // Find next available lecture number
    const availableLectures = Array.from({ length: lectureCount }, (_, i) => i + 1);
    const nextLecture = availableLectures.find(l => !existingLectures.includes(l)) || selectedLecture + 1;
    setSelectedLecture(Math.min(nextLecture, lectureCount));
    
    // Set time from schedule if available
    const periodTime = lecturePeriods[nextLecture - 1]?.startTime;
    setLectureTime(periodTime || getCurrentTime());
    setAttendance({});
    setSavedAttendance({});
    setIsSaved(false);
  };

  const handleLectureChange = (lectureNum: number) => {
    setSelectedLecture(lectureNum);
    // Auto-set time from schedule
    const periodTime = lecturePeriods[lectureNum - 1]?.startTime;
    if (periodTime) {
      setLectureTime(periodTime);
    }
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(formatDateForInput(date));
    setSelectedLecture(1);
    // Reset time from schedule
    const periodTime = lecturePeriods[0]?.startTime;
    setLectureTime(periodTime || getCurrentTime());
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

  const getLectureTimeDisplay = (lectureNum: number): string => {
    const period = lecturePeriods[lectureNum - 1];
    if (period) {
      return `${period.startTime} - ${period.endTime}`;
    }
    return "";
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

  if (!hasSchedule) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground text-center">
            No lecture schedule configured.
          </p>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Go to the "Schedule" tab to add subjects and lecture timings first.
          </p>
        </CardContent>
      </Card>
    );
  }

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Setup Alert */}
      {!hasSubjects && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">Tip:</span> Go to the "Schedule" tab to add subjects and configure lecture timings for this class.
          </AlertDescription>
        </Alert>
      )}

      {/* Subject Selection (if multiple subjects) */}
      {hasSubjects && (
        <div className="flex flex-wrap gap-2">
          {subjects.map((subject) => (
            <Button
              key={subject.id}
              variant={selectedSubject?.id === subject.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSubject(subject)}
              className={selectedSubject?.id === subject.id ? "" : subject.color}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {subject.name}
            </Button>
          ))}
        </div>
      )}

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
          <div className="flex gap-2">
            <Button onClick={markAllPresent} variant="outline" disabled={isSaved}>
              Mark All Present
            </Button>
            <Button 
              onClick={handleSaveClick} 
              disabled={saving || Object.keys(attendance).length === 0 || !hasChanges}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : isSaved ? "Update" : "Save Attendance"}
            </Button>
          </div>
        </div>

        {/* Lecture & Time Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Lecture Selector */}
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <Select
                value={String(selectedLecture)}
                onValueChange={(v) => handleLectureChange(Number(v))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Lecture" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: lectureCount }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={String(num)}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>Lecture {num}</span>
                        {existingLectures.includes(num) && <span className="text-chart-1">✓</span>}
                        {getLectureTimeDisplay(num) && (
                          <span className="text-xs text-muted-foreground">
                            {getLectureTimeDisplay(num)}
                          </span>
                        )}
                      </div>
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
                    onClick={() => handleLectureChange(l)}
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
      <div className="grid gap-2 sm:gap-4 grid-cols-3 sm:grid-cols-5">
        <Card className="border-none shadow">
          <CardContent className="p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.present}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Present</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow">
          <CardContent className="p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-destructive">{stats.absent}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Absent</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow">
          <CardContent className="p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.late}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Late</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow">
          <CardContent className="p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.excused}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Excused</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow">
          <CardContent className="p-2 sm:p-4 text-center">
            <p className="text-lg sm:text-2xl font-bold text-muted-foreground">{stats.unmarked}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Unmarked</p>
          </CardContent>
        </Card>
      </div>

      {/* Saved Status Badge */}
      {isSaved && (
        <Alert className="border-chart-1/50 bg-chart-1/10">
          <AlertCircle className="h-4 w-4 text-chart-1" />
          <AlertDescription className="text-chart-1">
            This lecture's attendance has been saved. Changes will require confirmation.
          </AlertDescription>
        </Alert>
      )}

      {/* Attendance Table */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-card-foreground flex flex-col sm:flex-row sm:items-center gap-2">
            <span>{formatDateDisplay(selectedDate)}</span>
            <div className="flex items-center gap-2 text-sm font-normal">
              <Badge variant="secondary">
                Lecture {selectedLecture}
                {getLectureTimeDisplay(selectedLecture) && ` (${getLectureTimeDisplay(selectedLecture)})`}
              </Badge>
              {selectedSubject && (
                <Badge className={selectedSubject.color}>
                  {selectedSubject.name}
                </Badge>
              )}
              {isSaved && (
                <Badge className="bg-chart-1/20 text-chart-1">
                  Saved
                </Badge>
              )}
              {hasChanges && (
                <Badge variant="outline" className="text-chart-3 border-chart-3">
                  Unsaved Changes
                </Badge>
              )}
            </div>
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
                const isChanged = isSaved && savedAttendance[student.id] && savedAttendance[student.id] !== status;
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
                        {isChanged && (
                          <Badge variant="outline" className="text-chart-3 border-chart-3 text-xs">
                            Changed
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={status || ""}
                        onValueChange={(value) => handleStatusChange(student.id, value as Attendance["status"])}
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

      {/* Change Warning Dialog */}
      <AlertDialog open={showChangeWarning} onOpenChange={setShowChangeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Saved Attendance?</AlertDialogTitle>
            <AlertDialogDescription>
              This attendance record has already been saved. Are you sure you want to change it? This action should only be done to correct mistakes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange}>Confirm Update</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}