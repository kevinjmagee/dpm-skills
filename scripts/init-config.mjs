#!/usr/bin/env node
import { initConfig } from "./dpm-config-lib.mjs";

const result = initConfig();
const verb = result.created ? "Created" : "Using existing";
console.log(`${verb} ${result.path}`);
console.log(`visitor_ref: ${result.visitor_ref} (${result.source})`);
