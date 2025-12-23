import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClassDetail } from "@/components/classes/ClassDetail";
import { getInstitute, getClass, Institute, Class } from "@/lib/db";

export default function ClassPage() {
  const { instituteId, classId } = useParams<{ instituteId: string; classId: string }>();
  const navigate = useNavigate();
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [classData, setClassData] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (instituteId && classId) {
        const [instData, clsData] = await Promise.all([
          getInstitute(instituteId),
          getClass(classId),
        ]);
        if (instData && clsData) {
          setInstitute(instData);
          setClassData(clsData);
        } else {
          navigate("/");
        }
      }
      setLoading(false);
    }
    load();
  }, [instituteId, classId, navigate]);

  const handleBack = () => {
    navigate(`/institute/${instituteId}`);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!institute || !classData) {
    return null;
  }

  return (
    <ClassDetail
      institute={institute}
      classData={classData}
      onBack={handleBack}
    />
  );
}
