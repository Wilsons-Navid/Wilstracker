import { requireCandidate } from "@/lib/dal";
import ProfileForm from "@/components/portal/profile-form";

export default async function PortalProfilePage() {
  const candidate = await requireCandidate();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold">Your profile</h1>
      <p className="mb-6 text-sm text-muted">
        Keep your details current — recruiters see this when they review your
        applications.
      </p>
      <ProfileForm candidate={candidate} />
    </div>
  );
}
