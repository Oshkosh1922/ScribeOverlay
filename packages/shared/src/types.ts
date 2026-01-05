import { z } from "zod";

export const ModeSchema = z.enum([
  "executive",
  "manager",
  "investor",
  "technical-lite"
]);
export type Mode = z.infer<typeof ModeSchema>;

export const ContextLevelSchema = z.enum(["minimal", "standard", "expanded"]);
export type ContextLevel = z.infer<typeof ContextLevelSchema>;

export const MetadataSchema = z.object({
  url: z.string().url().optional(),
  domain: z.string().optional(),
  title: z.string().optional()
});

export const GlossaryItemSchema = z.object({
  term: z.string(),
  definition: z.string()
});

export const ConfidenceSchema = z.object({
  level: z.enum(["low", "med", "high"]),
  rationale: z.string().min(3)
});

export const ExplainResponseSchema = z.object({
  mode: ModeSchema,
  contextLevel: ContextLevelSchema,
  metadata: MetadataSchema.optional(),
  tldr: z.string().min(2),
  keyConcepts: z.array(z.string()).min(1),
  definitions: z.array(GlossaryItemSchema).optional().default([]),
  whyItMatters: z.array(z.string()).min(1),
  risks: z.array(z.string()).optional().default([]),
  followUp: z.array(z.string()).min(1),
  confidence: ConfidenceSchema,
  securityFlag: z.string().optional(),
  rawTextHash: z.string().optional()
});
export type ExplainResponse = z.infer<typeof ExplainResponseSchema>;

export const ExplainRequestSchema = z.object({
  text: z.string().min(1),
  mode: ModeSchema,
  contextLevel: ContextLevelSchema,
  metadata: MetadataSchema,
  contextSnippet: z.string().optional(),
  redactionEnabled: z.boolean().default(true),
  expandedContextEnabled: z.boolean().optional(),
  conversationId: z.string().optional(),
  userId: z.string().optional()
});
export type ExplainRequest = z.infer<typeof ExplainRequestSchema>;

export const FollowUpRequestSchema = z.object({
  conversationId: z.string(),
  question: z.string().min(3),
  priorAnswerJson: ExplainResponseSchema,
  originalText: z.string().min(1)
});
export type FollowUpRequest = z.infer<typeof FollowUpRequestSchema>;

export type StreamKind = "delta" | "done" | "error";

export interface ExplainStreamChunk {
  type: StreamKind;
  content?: string;
  partialJson?: Partial<ExplainResponse>;
  error?: string;
}

export interface RedactionResult {
  redacted: string;
  original: string;
  replaced: Array<{ match: string; replacement: string }>;
}

export const UsageEventSchema = z.object({
  userId: z.string(),
  workspaceId: z.string().optional(),
  tokensIn: z.number(),
  tokensOut: z.number(),
  model: z.string(),
  domain: z.string().optional(),
  createdAt: z.date().optional()
});
export type UsageEvent = z.infer<typeof UsageEventSchema>;

export const PlanSchema = z.enum(["free", "pro", "team"]);
export type Plan = z.infer<typeof PlanSchema>;

export const PairingCodeSchema = z.object({
  code: z.string().length(6),
  userId: z.string(),
  workspaceId: z.string().optional(),
  expiresAt: z.date()
});
export type PairingCode = z.infer<typeof PairingCodeSchema>;

export const ExplainPayloadSchema = z.object({
  request: ExplainRequestSchema,
  redactionPreview: z.array(z.string()).optional()
});
export type ExplainPayload = z.infer<typeof ExplainPayloadSchema>;
