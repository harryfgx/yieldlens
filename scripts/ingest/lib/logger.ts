import { mkdirSync, appendFileSync } from "fs";
import { join } from "path";

const LOG_DIR = join(process.cwd(), "evidence/03-data-sources/ingestion-logs");
mkdirSync(LOG_DIR, { recursive: true });

export function createLogger(scriptName: string) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const logPath = join(LOG_DIR, `${scriptName}-${ts}.jsonl`);

  return {
    info(message: string, data?: Record<string, unknown>) {
      const entry = { level: "info", script: scriptName, message, ...data, ts: new Date().toISOString() };
      const line = JSON.stringify(entry);
      console.log(line);
      appendFileSync(logPath, line + "\n");
    },
    warn(message: string, data?: Record<string, unknown>) {
      const entry = { level: "warn", script: scriptName, message, ...data, ts: new Date().toISOString() };
      const line = JSON.stringify(entry);
      console.warn(line);
      appendFileSync(logPath, line + "\n");
    },
    error(message: string, data?: Record<string, unknown>) {
      const entry = { level: "error", script: scriptName, message, ...data, ts: new Date().toISOString() };
      const line = JSON.stringify(entry);
      console.error(line);
      appendFileSync(logPath, line + "\n");
    },
  };
}
