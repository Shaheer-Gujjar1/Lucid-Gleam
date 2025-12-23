import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getStudentsByClass, Student } from "@/lib/db";
import { Grid3X3, Save, RotateCcw, Settings, Users } from "lucide-react";

interface Seat {
  row: number;
  col: number;
  studentId: string | null;
}

interface SeatingChartProps {
  classId: string;
}

export function SeatingChart({ classId }: SeatingChartProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(6);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [classId]);

  const loadData = async () => {
    const studentsData = await getStudentsByClass(classId);
    setStudents(studentsData);

    // Load saved seating arrangement
    const savedSeats = localStorage.getItem(`seating-${classId}`);
    const savedConfig = localStorage.getItem(`seating-config-${classId}`);

    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setRows(config.rows);
      setCols(config.cols);
    }

    if (savedSeats) {
      setSeats(JSON.parse(savedSeats));
    } else {
      initializeSeats(rows, cols);
    }

    setLoading(false);
  };

  const initializeSeats = (r: number, c: number) => {
    const newSeats: Seat[] = [];
    for (let row = 0; row < r; row++) {
      for (let col = 0; col < c; col++) {
        newSeats.push({ row, col, studentId: null });
      }
    }
    setSeats(newSeats);
  };

  const handleSeatClick = (row: number, col: number) => {
    const seatIndex = seats.findIndex((s) => s.row === row && s.col === col);
    if (seatIndex === -1) return;

    const currentSeat = seats[seatIndex];

    if (selectedStudent) {
      // Remove student from any existing seat
      const updatedSeats = seats.map((seat) =>
        seat.studentId === selectedStudent ? { ...seat, studentId: null } : seat
      );

      // Assign student to clicked seat
      updatedSeats[seatIndex] = { ...currentSeat, studentId: selectedStudent };
      setSeats(updatedSeats);
      setSelectedStudent(null);
    } else if (currentSeat.studentId) {
      // Select the student in this seat for moving
      setSelectedStudent(currentSeat.studentId);
    }
  };

  const clearSeat = (row: number, col: number) => {
    setSeats((prev) =>
      prev.map((seat) => (seat.row === row && seat.col === col ? { ...seat, studentId: null } : seat))
    );
  };

  const saveArrangement = () => {
    localStorage.setItem(`seating-${classId}`, JSON.stringify(seats));
    localStorage.setItem(`seating-config-${classId}`, JSON.stringify({ rows, cols }));
    toast.success("Seating arrangement saved");
  };

  const resetArrangement = () => {
    initializeSeats(rows, cols);
    toast.success("Seating arrangement reset");
  };

  const applyConfig = () => {
    initializeSeats(rows, cols);
    setIsConfigOpen(false);
  };

  const autoAssign = () => {
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const newSeats: Seat[] = [];
    let studentIndex = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        newSeats.push({
          row,
          col,
          studentId: studentIndex < shuffled.length ? shuffled[studentIndex++].id : null,
        });
      }
    }

    setSeats(newSeats);
    toast.success("Students randomly assigned to seats");
  };

  const getStudentForSeat = (row: number, col: number) => {
    const seat = seats.find((s) => s.row === row && s.col === col);
    if (!seat?.studentId) return null;
    return students.find((s) => s.id === seat.studentId);
  };

  const getUnassignedStudents = () => {
    const assignedIds = new Set(seats.filter((s) => s.studentId).map((s) => s.studentId));
    return students.filter((s) => !assignedIds.has(s.id));
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Grid3X3 className="h-5 w-5" />
          Seating Chart
        </h2>
        <div className="flex gap-2">
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings className="h-4 w-4" />
                Configure
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configure Classroom Layout</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rows</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={rows}
                      onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Columns</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={cols}
                      onChange={(e) => setCols(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Total seats: {rows * cols} | Students: {students.length}
                </p>
                <Button onClick={applyConfig} className="w-full">
                  Apply Layout
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={autoAssign} className="gap-2">
            <Users className="h-4 w-4" />
            Auto Assign
          </Button>
          <Button variant="outline" onClick={resetArrangement} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button onClick={saveArrangement} className="gap-2">
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Card className="border-none shadow-lg">
            <CardHeader className="text-center border-b border-border">
              <CardTitle className="text-muted-foreground">Front of Classroom (Teacher's Desk)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: rows }).map((_, row) =>
                  Array.from({ length: cols }).map((_, col) => {
                    const student = getStudentForSeat(row, col);
                    const isSelected = selectedStudent && student?.id === selectedStudent;

                    return (
                      <div
                        key={`${row}-${col}`}
                        onClick={() => handleSeatClick(row, col)}
                        className={`
                          relative aspect-square rounded-lg border-2 border-dashed transition-all cursor-pointer
                          flex flex-col items-center justify-center p-2 text-center
                          ${student
                            ? "border-primary bg-primary/10 hover:bg-primary/20"
                            : "border-border hover:border-primary hover:bg-accent"
                          }
                          ${isSelected ? "ring-2 ring-primary ring-offset-2" : ""}
                        `}
                      >
                        {student ? (
                          <>
                            {student.photo ? (
                              <img
                                src={student.photo}
                                alt={student.name}
                                className="h-8 w-8 rounded-full object-cover mb-1"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mb-1">
                                {student.name.charAt(0)}
                              </div>
                            )}
                            <span className="text-xs font-medium text-foreground truncate w-full">
                              {student.name.split(" ")[0]}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                clearSeat(row, col);
                              }}
                              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {row + 1}-{col + 1}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-card-foreground text-sm">Unassigned Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {getUnassignedStudents().length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All students assigned
                  </p>
                ) : (
                  getUnassignedStudents().map((student) => (
                    <div
                      key={student.id}
                      onClick={() => setSelectedStudent(student.id)}
                      className={`
                        flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
                        ${selectedStudent === student.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-accent"
                        }
                      `}
                    >
                      {student.photo ? (
                        <img
                          src={student.photo}
                          alt={student.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                          {student.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-medium truncate">{student.name}</span>
                    </div>
                  ))
                )}
              </div>
              {selectedStudent && (
                <div className="mt-4 p-2 rounded-lg bg-accent text-accent-foreground text-sm text-center">
                  Click on a seat to place the selected student
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}