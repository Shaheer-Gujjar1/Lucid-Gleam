import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClassList } from "@/components/classes/ClassList";
import { getInstitute, Institute, Class } from "@/lib/db";

export default function InstitutePage() {
  const { instituteId } = useParams<{ instituteId: string }>();
  const navigate = useNavigate();
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (instituteId) {
        const data = await getInstitute(instituteId);
        if (data) {
          setInstitute(data);
        } else {
          navigate("/");
        }
      }
      setLoading(false);
    }
    load();
  }, [instituteId, navigate]);

  const handleBack = () => {
    navigate("/");
  };

  const handleSelectClass = (classData: Class) => {
    navigate(`/institute/${instituteId}/class/${classData.id}`);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!institute) {
    return null;
  }

  return (
    <ClassList
      institute={institute}
      onBack={handleBack}
      onSelectClass={handleSelectClass}
    />
  );
}
