import emailjs from "@emailjs/browser";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string;

export interface BugReportParams {
  title: string;
  description: string;
  steps: string;
  email: string;
}

export async function sendBugReport(params: BugReportParams): Promise<void> {
  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      bug_title: params.title,
      bug_description: params.description,
      bug_steps: params.steps,
      reply_to: params.email || "no-reply",
    },
    PUBLIC_KEY
  );
}
