import { requireCandidate } from "@/lib/dal";
import { getResumeSignedUrl } from "@/app/actions/resume";
import ProfileForm from "@/components/portal/profile-form";
import AvatarUpload from "@/components/candidates/avatar-upload";
import ResumeUpload from "@/components/candidates/resume-upload";
import Avatar from "@/components/ui/avatar";

export default async function PortalProfilePage() {
  const candidate = await requireCandidate();
  const resumeSignedUrl = candidate.resume_url
    ? await getResumeSignedUrl(candidate.id)
    : null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Avatar
          name={candidate.full_name}
          photoUrl={candidate.avatar_url}
          size="lg"
        />
        <div>
          <h1 className="text-xl font-semibold">{candidate.full_name}</h1>
          <p className="text-sm text-muted">
            {candidate.headline ?? "Keep your details current — recruiters see this."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <AvatarUpload
          candidateId={candidate.id}
          name={candidate.full_name}
          avatarUrl={candidate.avatar_url}
        />
        <ResumeUpload
          candidateId={candidate.id}
          hasFile={!!candidate.resume_url}
          signedUrl={resumeSignedUrl}
        />
        <ProfileForm candidate={candidate} />
      </div>
    </div>
  );
}
