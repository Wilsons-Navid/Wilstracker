import "server-only";

/**
 * Transactional email via Resend's HTTP API. Called directly with fetch so the
 * project needs no extra dependency.
 *
 * Email is best-effort: if RESEND_API_KEY is unset (e.g. local dev), every send
 * is skipped and the caller's action still succeeds. A notification never blocks
 * an application or a stage change.
 */

const FROM = process.env.RESEND_FROM ?? "WilsTracker <onboarding@resend.dev>";
const STAGE_LABELS: Record<string, string> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

async function send(to: string, subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return; // email disabled — no-op

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, text }),
    });
    if (!res.ok) {
      console.error("[email] send failed:", res.status, await res.text());
    }
  } catch (e) {
    console.error("[email] send error:", e instanceof Error ? e.message : e);
  }
}

export async function sendApplicationReceived(
  to: string | null,
  name: string,
  jobTitle: string,
): Promise<void> {
  if (!to) return;
  await send(
    to,
    `Application received: ${jobTitle}`,
    `Hi ${name},\n\nThanks for applying for ${jobTitle}. We have received your application and our team will review it shortly. You can track its status by signing in to your candidate portal.\n\n— The hiring team`,
  );
}

export async function sendStageChanged(
  to: string | null,
  name: string,
  jobTitle: string,
  stage: string,
): Promise<void> {
  if (!to) return;

  if (stage === "rejected") {
    await send(
      to,
      `Update on your application: ${jobTitle}`,
      `Hi ${name},\n\nThank you for your interest in ${jobTitle}. After careful review we have decided not to move forward at this time. We appreciate the time you invested and wish you the best in your search.\n\n— The hiring team`,
    );
    return;
  }
  if (stage === "offer") {
    await send(
      to,
      `Good news about your application: ${jobTitle}`,
      `Hi ${name},\n\nWe would like to extend an offer for ${jobTitle}. Someone from our team will be in touch shortly with the details.\n\n— The hiring team`,
    );
    return;
  }

  const label = STAGE_LABELS[stage] ?? stage;
  await send(
    to,
    `Your application moved to ${label}: ${jobTitle}`,
    `Hi ${name},\n\nYour application for ${jobTitle} has progressed to the ${label} stage. We will be in touch with any next steps. You can follow along in your candidate portal.\n\n— The hiring team`,
  );
}
