export type PhotoSlot = "before" | "after";

export type PhotoRole = "before" | "after" | "detail" | "irrelevant";

export const PHOTO_ROLES: readonly PhotoRole[] = ["before", "after", "detail", "irrelevant"];

/** Text and metadata only. Jev never receives image bytes. */
export type ProofPhotoState = {
  id: string;
  slot: PhotoSlot;
  width: number;
  height: number;
  createdAt: string;
};

export type ProofState = {
  address: string;
  jobDate: string;
  notes: string;
  voiceTranscript: string;
  beforeCount: number;
  afterCount: number;
  photos: ProofPhotoState[];
};

export type ChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
};

export type ScoreQuestion = {
  type: "score";
  instructions: string;
  criteria: string[];
};

export type NoulQuestion = {
  type: "noul";
  instructions: string;
  criteria?: { true: string; false: string };
};

export type Question = ChoiceQuestion | ScoreQuestion | NoulQuestion;

export type ChoiceAnswer = {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
};

export type ScoreAnswer = {
  type: "score";
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
};

export type NoulAnswer = {
  type: "noul";
  noul: number;
};

export type Answer = ChoiceAnswer | ScoreAnswer | NoulAnswer;

export type SystemOneResponse = {
  model: string;
  answers: Record<string, Answer>;
  usage: { input_tokens: number; output_tokens: number };
};

export type PhotoRoleAid = {
  id: string;
  slot: PhotoSlot;
  role: PhotoRole;
  probabilities: Record<string, number> | null;
  confidence: number | null;
};

/** Parsed Choice, Score, and Noul reading before the PDF gate is applied. */
export type ProofReading = {
  source: "jev" | "heuristic";
  model: string | null;
  calibrated: boolean;
  completeness: number;
  completenessRaw: number;
  completenessConfidence: number | null;
  completenessProbabilities: Record<string, number> | null;
  enoughForPdf: number;
  sameSite: number | null;
  photos: PhotoRoleAid[];
};

/**
 * Stored on the job. `completeness` is the 1–5 product score.
 * System One's raw score is the 0-based rubric index (`completenessRaw`).
 */
export type ProofAid = ProofReading & {
  stateKey: string;
  evaluatedAt: string;
  authority: "contractor" | "jev";
  appliedPdf: "allow" | "override";
  overrideReason: "none" | "incomplete" | "low_confidence";
  note: string;
  primary: boolean;
};
