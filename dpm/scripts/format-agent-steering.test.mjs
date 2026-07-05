#!/usr/bin/env node
/**
 * Vitest-free smoke tests for formatAgentSteering (run: node format-agent-steering.test.mjs)
 */
import { formatAgentSteering } from "./dpm-steering-cache.mjs";

const fixture = {
  guidance: {
    system_prompt: "You are a helpful assistant.\n\nCOACHING THIS TURN\n- Keep it brief.",
  },
  signals: { intent_stage: "exploring", receptivity: "neutral" },
  directives: { recommended_depth: "moderate", clarify_confusion: true },
  topics: {
    surface: ["Digital Marketing"],
    scaffold: ["Testing"],
    avoid: ["Pricing"],
  },
  cohort: { label: "Early Researcher", hedge: false },
};

const out = formatAgentSteering(fixture);
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
assert(out.includes("Digital Marketing"), "includes surface topic label");
assert(!/\bc\d+\b/.test(out), "no opaque concept ids");
assert(out.includes("clarify_confusion"), "includes active flag");

const missingLabel = formatAgentSteering({
  guidance: { system_prompt: "Coaching only" },
  topics: { scaffold: ["Labeled Only"] },
  signals: {},
  directives: {},
  cohort: { label: "X" },
});
assert(!missingLabel.includes("c48"), "missing labels omitted from digest");

if (failed === 0) {
  console.log("format-agent-steering.test.mjs: all passed");
} else {
  process.exit(1);
}
