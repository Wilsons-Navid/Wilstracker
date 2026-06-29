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
  active: boolean;
  description: string | null;
  location: string | null;
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

// The person. Pipeline fields (owner_id, job_id, stage, notes) live on Application.
export interface Candidate {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  location: string | null;
  headline: string | null;
  avatar_url: string | null;
  resume_url: string | null;
  resume_text: string | null;
  created_at: string;
  updated_at: string;
}

// Flattened board card: one application plus its candidate's display fields.
// `id` is the application id (the drag/move target and detail-page key).
export interface PipelineCard {
  id: string;
  candidate_id: string;
  full_name: string;
  avatar_url: string | null;
  linkedin_url: string | null;
  job_id: string | null;
  stage: CandidateStage;
  score: number | null; // latest AI assessment score, if any
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

export type QuestionKind = "text" | "choice";

// An extra question a job owner attaches to a job's application form.
export interface JobQuestion {
  id: string;
  job_id: string;
  prompt: string;
  kind: QuestionKind;
  options: string[]; // used when kind === "choice"
  position: number;
  required: boolean;
  created_at: string;
}

// One applicant's answer to a job question, scoped to their application.
export interface ApplicationAnswer {
  id: string;
  application_id: string;
  question_id: string;
  answer: string | null;
  created_at: string;
}

export interface CvAssessment {
  id: string;
  application_id: string;
  score: number | null;
  summary: string | null;
  strengths: string[] | null;
  gaps: string[] | null;
  recommendation: string | null;
  raw_json: unknown;
  created_at: string;
}
