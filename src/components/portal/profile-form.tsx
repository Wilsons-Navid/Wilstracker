"use client";

import { useActionState } from "react";
import {
  updateCandidateProfile,
  type ProfileState,
} from "@/app/actions/candidate-profile";
import type { Candidate } from "@/lib/types";

const inputCls =
  "rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

export default function ProfileForm({ candidate }: { candidate: Candidate }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateCandidateProfile,
    undefined,
  );

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
    >
      <h2 className="text-base font-semibold">Your details</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="full_name" className="text-sm font-medium">
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            defaultValue={candidate.full_name}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={candidate.email ?? ""}
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="headline" className="text-sm font-medium">
          Headline <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="headline"
          name="headline"
          defaultValue={candidate.headline ?? ""}
          placeholder="e.g. Senior Frontend Engineer"
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="location" className="text-sm font-medium">
            Location
          </label>
          <input
            id="location"
            name="location"
            defaultValue={candidate.location ?? ""}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={candidate.phone ?? ""}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="linkedin_url" className="text-sm font-medium">
            LinkedIn
          </label>
          <input
            id="linkedin_url"
            name="linkedin_url"
            type="url"
            defaultValue={candidate.linkedin_url ?? ""}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="portfolio_url" className="text-sm font-medium">
            Portfolio
          </label>
          <input
            id="portfolio_url"
            name="portfolio_url"
            type="url"
            defaultValue={candidate.portfolio_url ?? ""}
            className={inputCls}
          />
        </div>
      </div>

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state && "ok" in state && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
