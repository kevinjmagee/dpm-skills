#!/usr/bin/env node
/**
 * Vitest-free smoke tests for formatAgentSteering (run: node format-agent-steering.test.mjs)
 */
import { formatAgentSteering } from "./dpm-steering-cache.mjs";

const v4Fixture = {
  meta: { contract_version: 4 },
  guidance: {
    system_prompt: "You are a helpful assistant.\n\nCOACHING THIS TURN\n- Keep it brief.",
  },
  conversation: {
    signals: { intent_stage: "exploring", receptivity: "neutral" },
    directives: { recommended_depth: "moderate", clarify_confusion: true },
    topics: {
      surface: ["Digital Marketing"],
      scaffold: ["Testing"],
      avoid: ["Pricing"],
    },
    cohort: { label: "Early Researcher", hedge: false },
  },
  visitor: {
    signals: { intent_stage: "evaluating", visit_pattern: "returning" },
    directives: { skip_introductory_framing: true },
    topics: { deepen: ["API Integration"], avoid: ["Hard Sell"] },
    cohort: { label: "Power User", hedge: false },
  },
};

const out = formatAgentSteering(v4Fixture);
const lines = out.split("\n");

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
assert(out.includes("Power User"), "includes visitor cohort label");
assert(!/\bc\d+\b/.test(out), "no opaque concept ids");
assert(out.includes("clarify_confusion"), "includes conversation active flag");
assert(out.includes("skip_introductory_framing"), "includes visitor active flag");

const missingLabel = formatAgentSteering({
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
assert(!missingLabel.includes("c48"), "missing labels omitted from digest");
assert(missingLabel.includes("[visitor]"), "visitor scope present in minimal fixture");

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
