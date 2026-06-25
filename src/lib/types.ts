// Shared application types. These mirror the SQL schema in supabase/schema.sql.

export type UserRole = "admin" | "customer";

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

export interface Candidate {
  id: string;
  owner_id: string;
  job_id: string | null;
  full_name: string;
  email: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  resume_text: string | null;
  stage: CandidateStage;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CvAssessment {
  id: string;
  candidate_id: string;
  job_id: string | null;
  score: number | null;
  summary: string | null;
  strengths: string[] | null;
  gaps: string[] | null;
  recommendation: string | null;
  raw_json: unknown;
  created_at: string;
}
