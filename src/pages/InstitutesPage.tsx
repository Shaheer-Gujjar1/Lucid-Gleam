import { useNavigate } from "react-router-dom";
import { InstituteList } from "@/components/institutes/InstituteList";
import { Institute } from "@/lib/db";

export default function InstitutesPage() {
  const navigate = useNavigate();

  const handleSelectInstitute = (institute: Institute) => {
    navigate(`/institute/${institute.id}`);
  };

  return <InstituteList onSelectInstitute={handleSelectInstitute} />;
}
