import { useState } from "react";
import { InstituteList } from "@/components/institutes/InstituteList";
import { ClassList } from "@/components/classes/ClassList";
import { ClassDetail } from "@/components/classes/ClassDetail";
import { Institute, Class } from "@/lib/db";

const Index = () => {
  const [selectedInstitute, setSelectedInstitute] = useState<Institute | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  const handleSelectInstitute = (institute: Institute) => {
    setSelectedInstitute(institute);
    setSelectedClass(null);
  };

  const handleSelectClass = (classData: Class) => {
    setSelectedClass(classData);
  };

  const handleBackToInstitutes = () => {
    setSelectedInstitute(null);
    setSelectedClass(null);
  };

  const handleBackToClasses = () => {
    setSelectedClass(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground">TeacherDesk</h1>
          </div>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Manage your classes and students
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {selectedClass && selectedInstitute ? (
          <ClassDetail
            institute={selectedInstitute}
            classData={selectedClass}
            onBack={handleBackToClasses}
          />
        ) : selectedInstitute ? (
          <ClassList
            institute={selectedInstitute}
            onBack={handleBackToInstitutes}
            onSelectClass={handleSelectClass}
          />
        ) : (
          <InstituteList onSelectInstitute={handleSelectInstitute} />
        )}
      </main>
    </div>
  );
};

export default Index;
