#!/usr/bin/env node
import { sessionOff, sessionOn, sessionStatus } from "./dpm-config-lib.mjs";

const cmd = (process.argv[2] || "status").toLowerCase();

switch (cmd) {
  case "on": {
    const { sessionPath, session } = sessionOn({ dry: false });
    console.log(`DPM session ON (global until 'off')`);
    console.log(`session: ${sessionPath}`);
    console.log(`visitor_ref: ${session.visitor_ref}`);
    console.log(`dry_run: false`);
    break;
  }
  case "dry": {
    const { sessionPath, session } = sessionOn({ dry: true });
    console.log(`DPM session ON (dry_run)`);
    console.log(`session: ${sessionPath}`);
    console.log(`visitor_ref: ${session.visitor_ref}`);
    console.log(`dry_run: true`);
    break;
  }
  case "off": {
    const { sessionPath } = sessionOff();
    console.log(`DPM session OFF (global)`);
    console.log(`session: ${sessionPath}`);
    break;
  }
  case "status": {
    const status = sessionStatus();
    console.log(`active: ${status.active}`);
    console.log(`dry_run: ${status.dry_run}`);
    console.log(`visitor_ref: ${status.visitor_ref ?? "(not set — run init-config.mjs)"}`);
    console.log(`visitor_ref_source: ${status.visitor_ref_source}`);
    console.log(`config: ${status.config_path}`);
    console.log(`session: ${status.session_path}`);
    if (status.enabled_at) {
      console.log(`enabled_at: ${status.enabled_at}`);
    }
    console.log(JSON.stringify(status, null, 2));
    process.exit(status.active ? 0 : 1);
  }
  default:
    console.error(`Usage: dpm-session.mjs on|off|dry|status`);
    process.exit(2);
}
