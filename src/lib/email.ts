import "server-only";

/**
 * Transactional email via Resend's HTTP API. Called directly with fetch so the
 * project needs no extra dependency.
 *
 * Email is best-effort: if RESEND_API_KEY is unset (e.g. local dev), every send
 * is skipped and the caller's action still succeeds. A notification never blocks
 * an application, a stage change, or account creation.
 */

const FROM = process.env.RESEND_FROM ?? "WilsTracker <onboarding@resend.dev>";

// Used for the links/buttons in emails. Override per environment if needed.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://wilstracker.vercel.app";

const STAGE_LABELS: Record<string, string> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

const BRAND = "#0d9488"; // teal accent, matches the app

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Wraps copy in a simple, email-client-safe branded layout (inline styles only,
 * no external CSS). `paragraphs` is plain text; `cta` adds a button.
 */
function layout(
  heading: string,
  paragraphs: string[],
  cta?: { label: string; href: string },
): string {
  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">${escapeHtml(
          p,
        )}</p>`,
    )
    .join("");

  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;"><tr><td style="border-radius:8px;background:${BRAND};">
         <a href="${cta.href}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(
           cta.label,
         )}</a>
       </td></tr></table>`
    : "";

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:22px 28px;border-bottom:1px solid #f0f1f3;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:32px;height:32px;vertical-align:middle;"><img src="${APP_URL}/wilstracker-logo.png" width="32" height="32" alt="WilsTracker" style="display:block;border-radius:8px;" /></td>
            <td style="padding-left:10px;font-size:16px;font-weight:600;color:#111827;">WilsTracker</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:19px;line-height:1.3;color:#111827;">${escapeHtml(
            heading,
          )}</h1>
          ${body}
          ${button}
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #f0f1f3;font-size:12px;color:#9ca3af;">
          You're receiving this from WilsTracker. Please don't reply to this message.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function send(
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return; // email disabled — no-op

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html, text }),
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
  const paras = [
    `Hi ${name},`,
    `Thanks for applying for ${jobTitle}. We've received your application and our team will review it shortly.`,
    `You can follow its progress anytime from your candidate portal.`,
  ];
  await send(
    to,
    `Application received: ${jobTitle}`,
    layout(`Application received`, paras, {
      label: "View your application",
      href: `${APP_URL}/portal`,
    }),
    `${paras.join("\n\n")}\n\nTrack it: ${APP_URL}/portal\n\n— The hiring team`,
  );
}

export async function sendStageChanged(
  to: string | null,
  name: string,
  jobTitle: string,
  stage: string,
): Promise<void> {
  if (!to) return;

  let heading: string;
  let subject: string;
  let paras: string[];

  if (stage === "rejected") {
    heading = "An update on your application";
    subject = `Update on your application: ${jobTitle}`;
    paras = [
      `Hi ${name},`,
      `Thank you for your interest in ${jobTitle}. After careful review we've decided not to move forward at this time.`,
      `We appreciate the time you invested and wish you the very best in your search.`,
    ];
  } else if (stage === "offer") {
    heading = "Good news about your application";
    subject = `Good news about your application: ${jobTitle}`;
    paras = [
      `Hi ${name},`,
      `We'd like to extend an offer for ${jobTitle}. Someone from our team will be in touch shortly with the details.`,
    ];
  } else {
    const label = STAGE_LABELS[stage] ?? stage;
    heading = `Your application moved to ${label}`;
    subject = `Your application moved to ${label}: ${jobTitle}`;
    paras = [
      `Hi ${name},`,
      `Your application for ${jobTitle} has progressed to the ${label} stage. We'll be in touch with any next steps.`,
      `You can follow along in your candidate portal.`,
    ];
  }

  const isRejection = stage === "rejected";
  await send(
    to,
    subject,
    layout(
      heading,
      paras,
      isRejection
        ? undefined
        : { label: "View your application", href: `${APP_URL}/portal` },
    ),
    `${paras.join("\n\n")}${
      isRejection ? "" : `\n\nTrack it: ${APP_URL}/portal`
    }\n\n— The hiring team`,
  );
}

export async function sendAccountCreated(
  to: string | null,
  name: string,
  role: string,
): Promise<void> {
  if (!to) return;
  const roleLabel = role === "admin" ? "an administrator" : "a recruiter";
  const paras = [
    `Hi ${name},`,
    `An account was created for you on WilsTracker as ${roleLabel}.`,
    `Sign in with this email address (${to}) and the password your administrator shared with you. You can change it anytime from the sign-in page.`,
  ];
  await send(
    to,
    `Your WilsTracker account is ready`,
    layout(`Your account is ready`, paras, {
      label: "Sign in",
      href: `${APP_URL}/login`,
    }),
    `${paras.join("\n\n")}\n\nSign in: ${APP_URL}/login\n\n— The WilsTracker team`,
  );
}
