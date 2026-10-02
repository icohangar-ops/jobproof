import { describe, expect, it, vi } from "vitest";
import { decideProof, postSystemOne, resolveApiKey } from "@/lib/jev/client";
import { heuristicCompleteness, heuristicReading, heuristicRoles, heuristicSameSite } from "@/lib/jev/fallback";
import { formatDecisionAid, pdfDecisionLine, roleBadge } from "@/lib/jev/format";
import { applyGate } from "@/lib/jev/gate";
import {
  buildProofState,
  buildRequest,
  completenessFromRaw,
  DEFAULT_MODEL,
  DEFAULT_URL,
  includeSameSite,
  parseProofInput,
  proofQuestions,
  readingFromResponse,
} from "@/lib/jev/jobproof";
import { JevParseError, parseSystemOne } from "@/lib/jev/parse";
import { choice, noul, score } from "@/lib/jev/questions";
import type { ProofState, SystemOneResponse } from "@/lib/jev/types";

function state(overrides: Partial<ProofState> = {}): ProofState {
  return buildProofState({
    address: "418 Cedar Street",
    jobDate: "2026-04-02",
    notes: "Resealed the sink edge after the tile set.",
    voiceTranscript: "Silicone needs a full day before anyone wipes it.",
    photos: [
      { id: "b1", slot: "before", width: 1200, height: 900, createdAt: "2026-04-02T15:00:00.000Z" },
      { id: "a1", slot: "after", width: 1200, height: 900, createdAt: "2026-04-02T18:00:00.000Z" },
    ],
    ...overrides,
  });
}

function roleAnswer(role: "before" | "after" | "detail" | "irrelevant", confidence = 0.86) {
  const probabilities = { before: 0.05, after: 0.05, detail: 0.05, irrelevant: 0.85 };
  if (role !== "irrelevant") {
    probabilities.irrelevant = 0.05;
    probabilities[role] = 0.85;
  }
  return { type: "choice" as const, choice: role, probabilities, confidence };
}

function response(overrides: Partial<SystemOneResponse["answers"]> = {}): SystemOneResponse {
  return {
    model: "jev-1.13.0",
    answers: {
      role_0: roleAnswer("before", 0.86),
      role_1: roleAnswer("after", 0.84),
      completeness: {
        type: "score",
        score: 2.2,
        legend: {
          "0": "1 — Not a proof",
          "1": "2 — Thin",
          "2": "3 — Usable",
          "3": "4 — Solid",
          "4": "5 — Ready",
        },
        probabilities: { "0": 0.02, "1": 0.08, "2": 0.7, "3": 0.15, "4": 0.05 },
        confidence: 0.81,
      },
      enough_for_pdf: { type: "noul", noul: 0.77 },
      same_site: { type: "noul", noul: 0.66 },
      ...overrides,
    },
    usage: { input_tokens: 320, output_tokens: 0 },
  };
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

describe("question shapes", () => {
  it("builds choice, score, and noul", () => {
    const picked = choice("Which team?", { billing: "Payments", technical: "Bugs" });
    expect(picked.type).toBe("choice");
    expect(Object.keys(picked.criteria)).toEqual(["billing", "technical"]);
    const rated = score("How urgent?", ["Low", "High"]);
    expect(rated.criteria).toEqual(["Low", "High"]);
    const flag = noul("Is it open?", { true: "Cover off", false: "Latched" });
    expect(flag.criteria?.true).toBe("Cover off");
    const bare = noul("Is it urgent?");
    expect("criteria" in bare).toBe(false);
    expect(() => choice("Only one", { only: "one" })).toThrow(/2 and 255/);
    expect(() => score("One level", ["Only"])).toThrow(/2 and 10/);
  });

  it("asks for a role per photo, a 1–5 score, and skips same-site without metadata", () => {
    const ready = proofQuestions(state());
    expect(ready.role_0.type).toBe("choice");
    expect(ready.role_1.type).toBe("choice");
    expect(Object.keys(ready.role_0.type === "choice" ? ready.role_0.criteria : {})).toEqual([
      "before",
      "after",
      "detail",
      "irrelevant",
    ]);
    expect(ready.completeness.type).toBe("score");
    expect(ready.completeness.type === "score" && ready.completeness.criteria).toHaveLength(5);
    expect(ready.enough_for_pdf.type).toBe("noul");
    expect(ready.same_site.type).toBe("noul");

    const thin = state({
      address: "",
      photos: [{ id: "b1", slot: "before", width: 800, height: 600, createdAt: "2026-04-02T15:00:00.000Z" }],
    });
    expect(includeSameSite(thin)).toBe(false);
    expect(proofQuestions(thin).same_site).toBeUndefined();
    const request = buildRequest(thin, "jev-1.13.0");
    expect(request.model).toBe(DEFAULT_MODEL);
    expect(JSON.stringify(request.state)).not.toMatch(/data:image|base64,/);
    expect(request.state).not.toHaveProperty("blob");
  });
});

describe("parseSystemOne", () => {
  it("accepts a mixed Choice, Score, and Noul response", () => {
    const parsed = parseSystemOne(response());
    expect(parsed.model).toBe("jev-1.13.0");
    const reading = readingFromResponse(parsed, state());
    expect(reading.source).toBe("jev");
    expect(reading.calibrated).toBe(true);
    expect(reading.photos.map((photo) => photo.role)).toEqual(["before", "after"]);
    expect(reading.photos[0]?.probabilities?.before).toBe(0.85);
    expect(reading.completeness).toBe(3);
    expect(reading.completenessRaw).toBe(2.2);
    expect(reading.completenessConfidence).toBe(0.81);
    expect(reading.completenessProbabilities?.["2"]).toBe(0.7);
    expect(reading.enoughForPdf).toBe(0.77);
    expect(reading.sameSite).toBe(0.66);
    expect(completenessFromRaw(0)).toBe(1);
    expect(completenessFromRaw(4)).toBe(5);
  });

  it("rejects malformed answers", () => {
    expect(() => parseSystemOne(null)).toThrow(JevParseError);
    expect(() =>
      parseSystemOne({ model: "jev-1.13.0", answers: {}, usage: { input_tokens: 1, output_tokens: 0 } }),
    ).toThrow(/empty/);
    const badChoice = response();
    badChoice.answers.role_0 = {
      type: "choice",
      choice: "before",
      probabilities: { before: 0.2, after: 0.2, detail: 0.2, irrelevant: 0.2 },
      confidence: 0.4,
    };
    expect(() => parseSystemOne(badChoice)).toThrow(/sum to 1/);
    const badNoul = response();
    badNoul.answers.enough_for_pdf = { type: "noul", noul: 1.4 };
    expect(() => parseSystemOne(badNoul)).toThrow(/noul/);
    const missing = response();
    delete missing.answers.completeness;
    expect(() => readingFromResponse(parseSystemOne(missing), state())).toThrow(/completeness/);
    const outside = response();
    if (outside.answers.role_0.type === "choice") {
      outside.answers.role_0.choice = "landscape";
      outside.answers.role_0.probabilities = { landscape: 1 };
    }
    expect(() => readingFromResponse(parseSystemOne(outside), state())).toThrow(/before, after, detail, or irrelevant/);
    const noSame = response();
    delete noSame.answers.same_site;
    expect(() => readingFromResponse(parseSystemOne(noSame), state())).toThrow(/same_site/);
  });
});

describe("heuristic", () => {
  it("scores an empty job as not a proof and does not invent a same-site answer", () => {
    const empty = buildProofState({ notes: "", photos: [] });
    expect(heuristicCompleteness(empty)).toBe(1);
    expect(heuristicSameSite(empty)).toBeNull();
    expect(heuristicReading(empty).calibrated).toBe(false);
    expect(heuristicReading(empty).completenessConfidence).toBeNull();
  });

  it("trusts the contractor slot and marks a tiny image irrelevant", () => {
    const reading = heuristicReading(
      state({
        photos: [
          { id: "b1", slot: "before", width: 1200, height: 900, createdAt: "2026-04-02T15:00:00.000Z" },
          { id: "tiny", slot: "after", width: 16, height: 16, createdAt: "2026-04-02T18:00:00.000Z" },
        ],
      }),
    );
    expect(heuristicRoles(state())[0]?.role).toBe("before");
    expect(reading.photos[1]?.role).toBe("irrelevant");
    expect(reading.photos[1]?.probabilities?.irrelevant).toBe(0.88);
  });

  it("stays under 3 without both sides and reaches 3 with a before, an after, and a note", () => {
    const beforeOnly = state({
      address: "",
      notes: "Replaced the disposal and checked the leak.",
      voiceTranscript: "",
      photos: [{ id: "b1", slot: "before", width: 800, height: 600, createdAt: "2026-04-02T15:00:00.000Z" }],
    });
    expect(heuristicCompleteness(beforeOnly)).toBe(2);
    expect(heuristicReading(beforeOnly).enoughForPdf).toBeLessThan(0.5);
    expect(heuristicCompleteness(state())).toBeGreaterThanOrEqual(4);
    const bothShort = state({ notes: "Tile done", voiceTranscript: "" });
    expect(heuristicCompleteness(bothShort)).toBe(2);
    const bothNoted = state({ notes: "Resealed the sink edge today.", voiceTranscript: "" });
    expect(heuristicCompleteness(bothNoted)).toBe(3);
  });
});

describe("applyGate", () => {
  it("keeps the PDF available unless Jev is primary and confident", () => {
    const thinScore = response();
    if (thinScore.answers.completeness.type === "score") {
      thinScore.answers.completeness.score = 1.2;
      thinScore.answers.completeness.confidence = 0.81;
    }
    const reading = readingFromResponse(parseSystemOne(thinScore), state());
    expect(reading.completeness).toBe(2);
    const dual = applyGate({ reading, primary: false });
    expect(dual.appliedPdf).toBe("allow");
    expect(dual.authority).toBe("contractor");

    const blocked = applyGate({ reading, primary: true });
    expect(blocked.appliedPdf).toBe("override");
    expect(blocked.overrideReason).toBe("incomplete");
    expect(blocked.authority).toBe("jev");
    expect(blocked.note).toMatch(/not a safety determination/);

    const unsure = { ...reading, completeness: 4, completenessConfidence: 0.42 };
    const escalated = applyGate({ reading: unsure, primary: true });
    expect(escalated.appliedPdf).toBe("override");
    expect(escalated.overrideReason).toBe("low_confidence");
    expect(escalated.note).toMatch(/below 0.70/);

    const ready = { ...reading, completeness: 4, completenessConfidence: 0.9 };
    const allowed = applyGate({ reading: ready, primary: true });
    expect(allowed.appliedPdf).toBe("allow");
    expect(allowed.authority).toBe("jev");

    const offline = applyGate({
      reading: heuristicReading(state()),
      primary: true,
    });
    expect(offline.appliedPdf).toBe("allow");
    expect(offline.authority).toBe("contractor");
    expect(offline.note).toMatch(/not a calibrated score/);
  });
});

describe("formatDecisionAid", () => {
  it("labels the aid and does not claim certainty", () => {
    const reading = readingFromResponse(parseSystemOne(response()), state());
    const gate = applyGate({ reading, primary: false });
    const copy = formatDecisionAid({
      ...reading,
      ...gate,
      stateKey: "k",
      evaluatedAt: "2026-04-02T19:00:00.000Z",
    });
    expect(copy.label).toBe("Decision aid");
    expect(copy.suggestion).toBe("3 of 5");
    expect(copy.confidenceText).toMatch(/Calibrated confidence 81%/);
    expect(copy.confidenceText).toMatch(/not a certainty/);
    expect(copy.confidenceText).not.toMatch(/guaranteed|definitely safe|medical|osha/i);
    expect(copy.disclaimer).toMatch(/does not see the photos/);
    expect(copy.disclaimer).toMatch(/not a safety or medical determination/);
    expect(copy.flags).toMatch(/77% yes/);
    expect(copy.flags).toMatch(/Same site/);
    expect(roleBadge("detail")).toBe("Detail");

    const thin = heuristicReading(
      state({
        notes: "",
        voiceTranscript: "",
        photos: [{ id: "b1", slot: "before", width: 800, height: 600, createdAt: "2026-04-02T15:00:00.000Z" }],
        address: "",
      }),
    );
    const local = formatDecisionAid({
      ...thin,
      ...applyGate({ reading: thin, primary: false }),
      stateKey: "k",
      evaluatedAt: "",
    });
    expect(local.suggestion).toBe("Needs more");
    expect(local.confidenceText).toMatch(/not a calibrated model score/);
    expect(pdfDecisionLine(thin, false)).toMatch(/completeness 1 of 5/);
    expect(pdfDecisionLine(reading, false)).toBeUndefined();
    expect(pdfDecisionLine(reading, true)).toMatch(/person confirmed/);
  });
});

describe("decideProof", () => {
  it("uses the heuristic and does not call the network when no key is configured", async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      throw new Error("network");
    }) as typeof fetch;
    const aid = await decideProof(state(), { apiKey: "", env: {}, fetchImpl, now: "2026-04-02T19:00:00.000Z" });
    expect(called).toBe(false);
    expect(aid.source).toBe("heuristic");
    expect(aid.calibrated).toBe(false);
    expect(aid.completeness).toBeGreaterThanOrEqual(4);
    expect(aid.appliedPdf).toBe("allow");
    expect(aid.photos[0]?.probabilities).toBeTruthy();
  });

  it("posts metadata to System One and falls back when the call fails", async () => {
    const seen: { body?: unknown; auth?: string; url?: string } = {};
    const ok = (async (url: string, init?: RequestInit) => {
      seen.url = url;
      seen.auth = new Headers(init?.headers).get("Authorization") ?? "";
      seen.body = JSON.parse(String(init?.body));
      return jsonResponse(200, response());
    }) as typeof fetch;
    const aid = await decideProof(state({ notes: "Short note only, still both sides." }), {
      apiKey: "secret",
      env: { JEV_MODEL: "jev-1.13.0" },
      fetchImpl: ok,
      now: "2026-04-02T19:00:00.000Z",
    });
    expect(seen.url).toBe(DEFAULT_URL);
    expect(seen.auth).toBe("Bearer secret");
    const body = seen.body as {
      model: string;
      questions: { completeness: { type: string }; enough_for_pdf: { type: string } };
      state: { notes: string; photos: Array<{ width: number }> };
    };
    expect(body.model).toBe("jev-1.13.0");
    expect(body.questions.completeness.type).toBe("score");
    expect(body.questions.enough_for_pdf.type).toBe("noul");
    expect(body.state.photos[0]?.width).toBe(1200);
    expect(JSON.stringify(body.state)).not.toMatch(/data:image|base64,/);
    expect(aid.source).toBe("jev");
    expect(aid.model).toBe("jev-1.13.0");
    expect(aid.completeness).toBe(3);
    expect(aid.completenessConfidence).toBe(0.81);
    expect(aid.appliedPdf).toBe("allow");

    const failed = (async () => jsonResponse(500, { detail: "nope" })) as typeof fetch;
    const fallback = await decideProof(
      state({
        notes: "",
        voiceTranscript: "",
        photos: [{ id: "b1", slot: "before", width: 800, height: 600, createdAt: "2026-04-02T15:00:00.000Z" }],
      }),
      { apiKey: "secret", env: {}, fetchImpl: failed },
    );
    expect(fallback.source).toBe("heuristic");
    expect(fallback.calibrated).toBe(false);
    expect(fallback.completeness).toBeLessThan(3);
    expect(fallback.appliedPdf).toBe("allow");
  });

  it("logs both gates on dual run and still allows the PDF", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const aid = await decideProof(
      state({
        notes: "",
        voiceTranscript: "",
        address: "",
        photos: [],
      }),
      { apiKey: "", env: { JEV_DUAL_RUN: "1" }, now: "2026-04-02T19:00:00.000Z" },
    );
    expect(aid.appliedPdf).toBe("allow");
    expect(aid.completeness).toBe(1);
    expect(spy).toHaveBeenCalled();
    expect(String(spy.mock.calls[0]?.[0])).toMatch(/policy=allow/);
    expect(String(spy.mock.calls[0]?.[0])).toMatch(/aid_completeness=1/);
    expect(String(spy.mock.calls[0]?.[0])).toMatch(/source=heuristic/);
    spy.mockRestore();
  });

  it("soft-blocks on a confident low score when JEV_PRIMARY is set", async () => {
    const low = response();
    if (low.answers.completeness.type === "score") {
      low.answers.completeness.score = 1.1;
      low.answers.completeness.confidence = 0.91;
    }
    const fetchImpl = (async () => jsonResponse(200, low)) as typeof fetch;
    const blocked = await decideProof(state(), {
      apiKey: "secret",
      env: { JEV_PRIMARY: "1" },
      fetchImpl,
    });
    expect(blocked.appliedPdf).toBe("override");
    expect(blocked.overrideReason).toBe("incomplete");
    expect(blocked.authority).toBe("jev");
    expect(blocked.primary).toBe(true);

    const shy = response();
    if (shy.answers.completeness.type === "score") shy.answers.completeness.confidence = 0.4;
    const unsureFetch = (async () => jsonResponse(200, shy)) as typeof fetch;
    const confirm = await decideProof(state(), {
      apiKey: "secret",
      env: { JEV_PRIMARY: "1" },
      fetchImpl: unsureFetch,
    });
    expect(confirm.appliedPdf).toBe("override");
    expect(confirm.overrideReason).toBe("low_confidence");
  });

  it("retries once on 429", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      if (calls === 1) return jsonResponse(429, { detail: "slow" }, { "retry-after-ms": "0" });
      return jsonResponse(200, response());
    }) as typeof fetch;
    const raw = await postSystemOne(buildRequest(state()), {
      apiKey: "secret",
      url: DEFAULT_URL,
      fetchImpl,
      timeoutMs: 1000,
    });
    expect(calls).toBe(2);
    expect(parseSystemOne(raw).model).toBe("jev-1.13.0");
  });
});

describe("state", () => {
  it("drops image payloads and accepts either key name", () => {
    expect(resolveApiKey({ JEV_API_KEY: " jev ", TYPESAFE_API_KEY: "other" })).toBe("jev");
    expect(resolveApiKey({ TYPESAFE_API_KEY: "safe" })).toBe("safe");
    expect(resolveApiKey({})).toBe("");
    const scrubbed = buildProofState({
      notes: "See data:image/png;base64,aaaa the edge",
      photos: [
        {
          id: "b1",
          slot: "before",
          width: 400,
          height: 300,
          createdAt: "2026-04-02T15:00:00.000Z",
          blob: "nope",
          dataUrl: "data:image/png;base64,bbbb",
        } as { id: string; slot: "before"; width: number; height: number; createdAt: string },
      ],
    });
    expect(scrubbed.notes).not.toMatch(/base64,/);
    expect(JSON.stringify(scrubbed)).not.toMatch(/data:image|blob/);
    expect(parseProofInput({ state: { blob: "abc" } })).toBeNull();
    expect(parseProofInput({ state: { notes: "Tile", photos: [] } })?.notes).toBe("Tile");
  });
});
