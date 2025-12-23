import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Scale, Plus, Trash2, Check } from "lucide-react";

interface GradeLevel {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  color: string;
}

interface GradingScale {
  id: string;
  name: string;
  levels: GradeLevel[];
}

const defaultScales: GradingScale[] = [
  {
    id: "us-standard",
    name: "US Standard (A-F)",
    levels: [
      { grade: "A", minPercentage: 90, maxPercentage: 100, color: "chart-1" },
      { grade: "B", minPercentage: 80, maxPercentage: 89, color: "chart-2" },
      { grade: "C", minPercentage: 70, maxPercentage: 79, color: "chart-3" },
      { grade: "D", minPercentage: 60, maxPercentage: 69, color: "chart-4" },
      { grade: "F", minPercentage: 0, maxPercentage: 59, color: "destructive" },
    ],
  },
  {
    id: "percentage",
    name: "Percentage Only",
    levels: [
      { grade: "Excellent", minPercentage: 90, maxPercentage: 100, color: "chart-1" },
      { grade: "Good", minPercentage: 75, maxPercentage: 89, color: "chart-2" },
      { grade: "Satisfactory", minPercentage: 60, maxPercentage: 74, color: "chart-3" },
      { grade: "Needs Improvement", minPercentage: 40, maxPercentage: 59, color: "chart-4" },
      { grade: "Failing", minPercentage: 0, maxPercentage: 39, color: "destructive" },
    ],
  },
  {
    id: "points-10",
    name: "10-Point Scale",
    levels: [
      { grade: "10", minPercentage: 95, maxPercentage: 100, color: "chart-1" },
      { grade: "9", minPercentage: 85, maxPercentage: 94, color: "chart-1" },
      { grade: "8", minPercentage: 75, maxPercentage: 84, color: "chart-2" },
      { grade: "7", minPercentage: 65, maxPercentage: 74, color: "chart-3" },
      { grade: "6", minPercentage: 55, maxPercentage: 64, color: "chart-4" },
      { grade: "5", minPercentage: 45, maxPercentage: 54, color: "chart-4" },
      { grade: "Below 5", minPercentage: 0, maxPercentage: 44, color: "destructive" },
    ],
  },
];

const colorOptions = [
  { value: "chart-1", label: "Green" },
  { value: "chart-2", label: "Purple" },
  { value: "chart-3", label: "Blue" },
  { value: "chart-4", label: "Primary" },
  { value: "destructive", label: "Red" },
];

export function CustomGradingScales() {
  const [scales, setScales] = useState<GradingScale[]>(defaultScales);
  const [activeScale, setActiveScale] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newScale, setNewScale] = useState<GradingScale>({
    id: "",
    name: "",
    levels: [{ grade: "", minPercentage: 0, maxPercentage: 100, color: "chart-1" }],
  });

  useEffect(() => {
    // Load saved scales from localStorage
    const savedScales = localStorage.getItem("gradingScales");
    const savedActive = localStorage.getItem("activeGradingScale");
    
    if (savedScales) {
      const parsed = JSON.parse(savedScales);
      setScales([...defaultScales, ...parsed]);
    } else {
      setScales(defaultScales);
    }
    
    setActiveScale(savedActive || "us-standard");
  }, []);

  const saveScales = (newScales: GradingScale[]) => {
    const customScales = newScales.filter((s) => !defaultScales.some((d) => d.id === s.id));
    localStorage.setItem("gradingScales", JSON.stringify(customScales));
  };

  const handleSetActive = (scaleId: string) => {
    setActiveScale(scaleId);
    localStorage.setItem("activeGradingScale", scaleId);
    toast.success("Grading scale updated");
  };

  const addLevel = () => {
    setNewScale((prev) => ({
      ...prev,
      levels: [...prev.levels, { grade: "", minPercentage: 0, maxPercentage: 100, color: "chart-1" }],
    }));
  };

  const removeLevel = (index: number) => {
    setNewScale((prev) => ({
      ...prev,
      levels: prev.levels.filter((_, i) => i !== index),
    }));
  };

  const updateLevel = (index: number, field: keyof GradeLevel, value: string | number) => {
    setNewScale((prev) => ({
      ...prev,
      levels: prev.levels.map((level, i) => (i === index ? { ...level, [field]: value } : level)),
    }));
  };

  const handleSaveScale = () => {
    if (!newScale.name.trim()) {
      toast.error("Please enter a scale name");
      return;
    }

    if (newScale.levels.some((l) => !l.grade.trim())) {
      toast.error("All grade levels must have a name");
      return;
    }

    const scaleWithId = {
      ...newScale,
      id: crypto.randomUUID(),
    };

    const updatedScales = [...scales, scaleWithId];
    setScales(updatedScales);
    saveScales(updatedScales);
    setIsDialogOpen(false);
    setNewScale({
      id: "",
      name: "",
      levels: [{ grade: "", minPercentage: 0, maxPercentage: 100, color: "chart-1" }],
    });
    toast.success("Grading scale created");
  };

  const deleteScale = (scaleId: string) => {
    const updatedScales = scales.filter((s) => s.id !== scaleId);
    setScales(updatedScales);
    saveScales(updatedScales);
    if (activeScale === scaleId) {
      handleSetActive("us-standard");
    }
    toast.success("Grading scale deleted");
  };

  const getGradeForPercentage = (percentage: number, scale: GradingScale) => {
    const level = scale.levels.find(
      (l) => percentage >= l.minPercentage && percentage <= l.maxPercentage
    );
    return level || scale.levels[scale.levels.length - 1];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Grading Scales</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Scale
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Custom Grading Scale</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Scale Name</Label>
                <Input
                  value={newScale.name}
                  onChange={(e) => setNewScale((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., IB Scale, European Scale"
                />
              </div>

              <div className="space-y-2">
                <Label>Grade Levels</Label>
                <div className="space-y-3">
                  {newScale.levels.map((level, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-background">
                      <Input
                        value={level.grade}
                        onChange={(e) => updateLevel(index, "grade", e.target.value)}
                        placeholder="Grade"
                        className="w-24"
                      />
                      <Input
                        type="number"
                        value={level.minPercentage}
                        onChange={(e) => updateLevel(index, "minPercentage", parseInt(e.target.value))}
                        placeholder="Min %"
                        className="w-20"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        value={level.maxPercentage}
                        onChange={(e) => updateLevel(index, "maxPercentage", parseInt(e.target.value))}
                        placeholder="Max %"
                        className="w-20"
                      />
                      <Select
                        value={level.color}
                        onValueChange={(value) => updateLevel(index, "color", value)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {colorOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {newScale.levels.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLevel(index)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button variant="outline" onClick={addLevel} className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Add Level
                </Button>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveScale}>Create Scale</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {scales.map((scale) => (
          <Card
            key={scale.id}
            className={`border-none shadow-lg cursor-pointer transition-all ${
              activeScale === scale.id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => handleSetActive(scale.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <Scale className="h-5 w-5" />
                  {scale.name}
                </CardTitle>
                {activeScale === scale.id && (
                  <Badge className="bg-primary/20 text-primary gap-1">
                    <Check className="h-3 w-3" />
                    Active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {scale.levels.map((level, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <Badge className={`bg-${level.color}/20 text-${level.color}`}>
                      {level.grade}
                    </Badge>
                    <span className="text-muted-foreground">
                      {level.minPercentage}% - {level.maxPercentage}%
                    </span>
                  </div>
                ))}
              </div>
              {!defaultScales.some((d) => d.id === scale.id) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-4 text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteScale(scale.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Scale
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-card-foreground">Grade Preview</CardTitle>
          <CardDescription>See how different percentages translate to grades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[100, 95, 85, 75, 65, 55, 45, 35, 25].map((percentage) => {
              const currentScale = scales.find((s) => s.id === activeScale) || scales[0];
              const level = getGradeForPercentage(percentage, currentScale);
              return (
                <div key={percentage} className="text-center p-3 rounded-lg bg-background min-w-20">
                  <div className="text-lg font-bold text-foreground">{percentage}%</div>
                  <Badge className={`bg-${level.color}/20 text-${level.color} mt-1`}>
                    {level.grade}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}