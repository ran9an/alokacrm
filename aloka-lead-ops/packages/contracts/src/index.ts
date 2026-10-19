import { z } from "zod";
export function phone(value: string): string {
  const digits = value.replace(/[^0-9]/g, "");
  const normalized = digits.length === 10 ? "91" + digits : digits;
  if (!/^[1-9][0-9]{7,14}$/.test(normalized))
    throw new Error("Invalid E.164 phone");
  return "+" + normalized;
}
export const intakeSchema = z.object({
  eventId: z.string().min(1).max(200),
  source: z.enum([
    "meta_whatsapp",
    "magicbricks",
    "housing",
    "website",
    "manual",
  ]),
  name: z.string().trim().min(1).max(150),
  phone: z
    .string()
    .max(40)
    .transform((value, ctx) => {
      try {
        return phone(value);
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid E.164 phone" });
        return z.NEVER;
      }
    }),
  project: z.string().default("aloka-green-county"),
  consent: z.object({
    whatsapp: z.boolean(),
    evidence: z.string().min(1).max(500),
  }),
  attribution: z.record(z.string(), z.string().max(500)).default({}),
});
export type Intake = z.infer<typeof intakeSchema>;
export const stages = [
  "new",
  "contacted",
  "qualified",
  "visit_scheduled",
  "visited",
  "negotiation",
  "booked",
  "registered",
  "lost",
] as const;
export const patchSchema = z
  .object({
    stage: z.enum(stages).optional(),
    optedOut: z.literal(true).optional(),
    ownerId: z.uuid().nullable().optional(),
    qualification: z
      .object({
        purpose: z.enum(["self_use", "investment", "both"]).optional(),
        timeline: z.enum(["immediate", "three_months", "six_months", "exploring"]).optional(),
        locationPreference: z.string().trim().max(200).optional(),
        notes: z.string().trim().max(1000).optional(),
      })
      .optional(),
    lostReason: z.string().trim().min(1).max(300).nullable().optional(),
  })
  .strict();
export const followupSchema = z.object({
  dueAt: z.iso.datetime(),
  body: z.string().min(1).max(2000),
  key: z.string().min(1).max(200),
});
export type Role = "admin" | "manager" | "sales" | "viewer";
export const activitySchema = z.object({
  kind: z.enum(["call", "note", "task"]),
  body: z.string().trim().min(1).max(2000),
  outcome: z.string().trim().max(300).optional(),
  dueAt: z.iso.datetime().optional(),
});
export const visitSchema = z.object({
  scheduledAt: z.iso.datetime(),
  assignedTo: z.uuid().optional(),
  meetingPoint: z.enum(["Hope Farm", "Kadugodi Metro Station", "Hoskote Toll Gate", "Chikka Tirupathi Temple", "Sarjapur Police Station", "Corporate Office in Kammasandra", "Self-drive"]),
  notes: z.string().trim().max(1000).optional(),
});
export const visitPatchSchema = z.object({
  status: z.enum(["scheduled", "completed", "cancelled", "rescheduled"]),
  feedback: z.string().trim().max(2000).optional(),
  plotsShown: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
});
export const quickSendSchema = z.object({
  action: z.enum(["share_brochure", "confirm_site_visit", "share_location", "request_callback"]),
});
export function canAccess(role: Role, userId: string, owner: string | null) {
  return role !== "sales" || userId === owner;
}
export function sendWindow(date: Date, start = 9, end = 21) {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(date),
  );
  return h >= start && h < end;
}
