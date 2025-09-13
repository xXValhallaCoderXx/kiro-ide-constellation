import { spawn } from "node:child_process";

export async function selfTest(nodeBin: string, serverJs: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const child = spawn(nodeBin, [serverJs, "--selftest"], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let done = false;

    const finish = (ok: boolean) => {
      if (!done) {
        done = true;
        resolve(ok);
      }
    };

    child.stdout.on("data", (d) => { out += d.toString(); });
    child.on("error", () => finish(false));
    child.on("close", (code) => finish(code === 0 && out.includes("SELFTEST_OK")));

    setTimeout(() => {
      try { child.kill(); } catch {}
      finish(false);
    }, 4000);
  });
}
