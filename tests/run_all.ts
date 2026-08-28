import { spawn } from "node:child_process";
import path from "node:path";

const testFiles = [
  "tests/cpcb_aqi.test.ts",
  "tests/live_feed.test.ts",
  "tests/forecast_continuity.test.ts",
  "tests/policy_simulation.test.ts",
];

async function runTest(file: string): Promise<{ file: string; success: boolean; duration: number }> {
  const start = Date.now();
  return new Promise((resolve) => {
    const proc = spawn("npx", ["tsx", "--test", file], {
      shell: true,
      stdio: "inherit",
      cwd: process.cwd(),
    });

    proc.on("close", (code) => {
      resolve({
        file,
        success: code === 0,
        duration: Date.now() - start,
      });
    });
  });
}

async function main() {
  console.log("==========================================================");
  console.log("🧪 VayuX Automated Verification & Test Suite Runner");
  console.log("==========================================================\n");

  const results: Array<{ file: string; success: boolean; duration: number }> = [];

  for (const file of testFiles) {
    console.log(`▶ Running ${file}...`);
    const res = await runTest(file);
    results.push(res);
    console.log(`✔ Finished ${file} in ${res.duration}ms [${res.success ? "PASS" : "FAIL"}]\n`);
  }

  console.log("==========================================================");
  console.log("📊 Summary of Test Results:");
  console.log("==========================================================");
  let allPass = true;
  for (const r of results) {
    const symbol = r.success ? "✅ PASS" : "❌ FAIL";
    console.log(`${symbol} | ${r.file.padEnd(35)} (${r.duration}ms)`);
    if (!r.success) allPass = false;
  }

  console.log("==========================================================");
  if (allPass) {
    console.log("🎉 ALL TESTS PASSED! VayuX engine verified & robust.");
    process.exit(0);
  } else {
    console.error("💥 SOME TESTS FAILED. Please review the output above.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner execution failed:", err);
  process.exit(1);
});
