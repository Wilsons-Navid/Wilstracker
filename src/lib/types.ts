// Shared application types. These mirror the SQL schema in supabase/schema.sql.

export type UserRole = "admin" | "customer" | "candidate";

export type ApplicationStatus = "active" | "withdrawn" | "archived";

export type CandidateStage =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

// Ordered list that drives the Kanban columns.
export const STAGES: CandidateStage[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
];

export const STAGE_LABELS: Record<CandidateStage, string> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_by: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  location: string | null;
  status: string;
  created_at: string;
}

// The person. In the candidate-portal model the pipeline fields (owner_id,
// job_id, stage, notes) move to Application; they remain here until the
// Phase 2 refactor migrates the recruiter UI onto applications.
export interface Candidate {
  id: string;
  owner_id: string;
  job_id: string | null;
  auth_user_id?: string | null;
  full_name: string;
  email: string | null;
  phone?: string | null;
  linkedin_url: string | null;
  portfolio_url?: string | null;
  location?: string | null;
  headline?: string | null;
  avatar_url: string | null;
  resume_url: string | null;
  resume_text: string | null;
  stage: CandidateStage;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// The pipeline entry: one candidate applying to one job.
export interface Application {
  id: string;
  candidate_id: string;
  job_id: string | null;
  owner_id: string;
  stage: CandidateStage;
  status: ApplicationStatus;
  source: string | null;
  notes: string | null;
  applied_at: string;
  created_at: string;
  updated_at: string;
}

export interface StageHistory {
  id: string;
  application_id: string;
  from_stage: CandidateStage | null;
  to_stage: CandidateStage;
  moved_by: string | null;
  moved_at: string;
}

// candidate_id/job_id are the pre-migration keys; application_id is the target.
// Both kept until the Phase 2 refactor moves queries onto application_id.
export interface CvAssessment {
  id: string;
  candidate_id: string;
  job_id: string | null;
  application_id?: string;
  score: number | null;
  summary: string | null;
  strengths: string[] | null;
  gaps: string[] | null;
  recommendation: string | null;
  raw_json: unknown;
  created_at: string;
}
