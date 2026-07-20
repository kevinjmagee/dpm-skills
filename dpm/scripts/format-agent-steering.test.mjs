#!/usr/bin/env node
/**
 * Vitest-free smoke tests for formatAgentSteering (run: node format-agent-steering.test.mjs)
 */
import { formatAgentSteering } from "./dpm-steering-cache.mjs";

const v5Fixture = {
  meta: { contract_version: 5 },
  guidance: {
    system_prompt: "You are a helpful assistant.\n\nCOACHING THIS TURN\n- Keep it brief.",
  },
  conversation: {
    signals: {
      intent_stage: "exploring",
      receptivity: "neutral",
      verification: "high",
      iteration_patience: "strained",
    },
    directives: { recommended_depth: "moderate", clarify_confusion: true },
    topics: {
      surface: ["Digital Marketing"],
      scaffold: ["Testing"],
      avoid: ["Pricing"],
    },
    behavior_cluster: { label: "Early Researcher", hedge: false, source: "derived" },
    meta: { personalization_source: "system1", evidence_turns: 2, profile_version: 0 },
  },
  visitor: {
    signals: { intent_stage: "evaluating", visit_pattern: "returning" },
    directives: { skip_introductory_framing: true },
    topics: { deepen: ["API Integration"], avoid: ["Hard Sell"] },
    behavior_cluster: { label: "Power User", hedge: false, source: "trait" },
  },
};

const out = formatAgentSteering(v5Fixture);

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

assert(out.includes("COACHING THIS TURN"), "includes coaching block");
assert(out.includes("STRUCTURED STEERING"), "includes structured digest");
assert(out.includes("[conversation]"), "includes conversation scope label");
assert(out.includes("[visitor]"), "includes visitor scope label");
assert(out.includes("Digital Marketing"), "includes conversation surface topic");
assert(out.includes("API Integration"), "includes visitor deepen topic");
assert(out.includes("Cluster: Power User"), "includes visitor behavior_cluster label");
assert(out.includes("(trait)"), "includes visitor cluster source");
assert(out.includes("Meta —"), "includes scoped meta line");
assert(!/\bc\d+\b/.test(out), "no opaque concept ids");
assert(out.includes("clarify_confusion"), "includes conversation active flag");
assert(out.includes("skip_introductory_framing"), "includes visitor active flag");
assert(out.includes("Traits —") && out.includes("verification: high"), "includes WHO trait digest line");
assert(!/\bv6\b/i.test(out), "digest has no era/version labels");

// v4 cohort alias still works
const v4Out = formatAgentSteering({
  meta: { contract_version: 4 },
  guidance: { system_prompt: "Coaching only" },
  conversation: {
    topics: { scaffold: ["Labeled Only"] },
    signals: {},
    directives: {},
    cohort: { label: "X" },
  },
  visitor: {
    signals: {},
    directives: {},
    topics: {},
    cohort: { label: "Y" },
  },
});
assert(v4Out.includes("Cluster: X"), "v4 cohort maps to cluster label in digest");
assert(!v4Out.includes("c48"), "missing labels omitted from digest");
assert(v4Out.includes("[visitor]"), "visitor scope present in minimal fixture");

// Legacy v3 flat fallback (test systems)
const v3Out = formatAgentSteering({
  guidance: { system_prompt: "Legacy" },
  signals: { intent_stage: "deciding" },
  directives: {},
  topics: {},
  cohort: { label: "Shipper" },
});
assert(v3Out.includes("[conversation]"), "v3 flat maps to conversation scope in digest");

if (failed === 0) {
  console.log("format-agent-steering.test.mjs: all passed");
} else {
  process.exit(1);
}
