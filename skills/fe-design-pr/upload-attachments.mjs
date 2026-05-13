#!/usr/bin/env node
// Push VRT artifacts to refs/uploads/pulls/<N> via Git Data API.
// Fast-forward only; no force. Prints JSON: { commitSha, components: { <Name>: { figma, code, diff } } }
//
// Usage:
//   upload-attachments.mjs --owner <O> --repo <R> --pr <N> \
//     --component <Name>:<figma.png>,<code.png>,<diff.png> \
//     [--component <Name>:<figma.png>,<code.png>,<diff.png> ...]

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const exec = promisify(execFile);

function parseArgs(argv) {
  const args = { components: [] };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const val = argv[++i];
    if (flag === "--owner") args.owner = val;
    else if (flag === "--repo") args.repo = val;
    else if (flag === "--pr") args.pr = val;
    else if (flag === "--component") {
      const [name, files] = val.split(":");
      const [figma, code, diff] = files.split(",");
      args.components.push({ name, figma, code, diff });
    } else die(`unknown flag: ${flag}`);
  }
  for (const k of ["owner", "repo", "pr"]) if (!args[k]) die(`missing --${k}`);
  if (!args.components.length) die("at least one --component required");
  return args;
}

function die(msg) {
  console.error(msg);
  process.exit(2);
}

// gh api wrapper; reads stdin payload as JSON. -q for jq path on the output.
async function gh(path, { method = "GET", body, query } = {}) {
  const args = ["api", path];
  if (method !== "GET") args.push("--method", method);
  if (query) for (const [k, v] of Object.entries(query)) args.push("-f", `${k}=${v}`);
  const opts = { maxBuffer: 64 * 1024 * 1024 };
  if (body !== undefined) {
    args.push("--input", "-");
    const { stdout, stderr } = await execStdin("gh", args, JSON.stringify(body), opts);
    if (stderr) process.stderr.write(stderr);
    return JSON.parse(stdout);
  }
  const { stdout } = await exec("gh", args, opts);
  return JSON.parse(stdout);
}

function execStdin(cmd, args, input, opts) {
  return new Promise((resolve, reject) => {
    const child = execFile(cmd, args, opts, (err, stdout, stderr) => {
      if (err) reject(Object.assign(err, { stdout, stderr }));
      else resolve({ stdout, stderr });
    });
    child.stdin.end(input);
  });
}

async function createBlob(owner, repo, path) {
  const content = (await readFile(path)).toString("base64");
  const { sha } = await gh(`repos/${owner}/${repo}/git/blobs`, {
    method: "POST",
    body: { content, encoding: "base64" },
  });
  return sha;
}

async function createTree(owner, repo, entries) {
  const { sha } = await gh(`repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: { tree: entries },
  });
  return sha;
}

async function getRefTip(owner, repo, ref) {
  try {
    const result = await gh(`repos/${owner}/${repo}/git/ref/${ref}`);
    return result.object.sha;
  } catch (e) {
    // Distinguish "ref doesn't exist" (404) from auth/permission failures.
    if (e.stderr && /HTTP 404/.test(e.stderr)) return null;
    throw e;
  }
}

async function createCommit(owner, repo, treeSha, parentSha, prNumber) {
  const body = {
    message: `vrt: PR #${prNumber} @ ${new Date().toISOString()}`,
    tree: treeSha,
  };
  if (parentSha) body.parents = [parentSha];
  const { sha } = await gh(`repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    body,
  });
  return sha;
}

async function pushRef(owner, repo, refPath, commitSha, exists) {
  if (exists) {
    // PATCH for fast-forward; no force.
    await gh(`repos/${owner}/${repo}/git/refs/${refPath}`, {
      method: "PATCH",
      body: { sha: commitSha },
    });
    return;
  }
  // First-create. Retry as PATCH if a concurrent run created the ref between
  // our getRefTip and this POST (422 "Reference already exists").
  try {
    await gh(`repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      body: { ref: `refs/${refPath}`, sha: commitSha },
    });
  } catch (e) {
    if (e.stderr && /already exists/i.test(e.stderr)) {
      await gh(`repos/${owner}/${repo}/git/refs/${refPath}`, {
        method: "PATCH",
        body: { sha: commitSha },
      });
      return;
    }
    throw e;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { owner, repo, pr, components } = args;
  const refPath = `uploads/pulls/${pr}`;

  const tree = [];
  const componentMap = {};
  for (const c of components) {
    const [figmaSha, codeSha, diffSha] = await Promise.all([
      createBlob(owner, repo, c.figma),
      createBlob(owner, repo, c.code),
      createBlob(owner, repo, c.diff),
    ]);
    tree.push(
      { path: `${c.name}/figma.png`, mode: "100644", type: "blob", sha: figmaSha },
      { path: `${c.name}/code.png`, mode: "100644", type: "blob", sha: codeSha },
      { path: `${c.name}/diff.png`, mode: "100644", type: "blob", sha: diffSha },
    );
    componentMap[c.name] = { figma: figmaSha, code: codeSha, diff: diffSha };
  }

  const treeSha = await createTree(owner, repo, tree);
  const parentSha = await getRefTip(owner, repo, refPath);
  const commitSha = await createCommit(owner, repo, treeSha, parentSha, pr);
  await pushRef(owner, repo, refPath, commitSha, parentSha !== null);

  console.log(
    JSON.stringify(
      {
        commitSha,
        ref: `refs/${refPath}`,
        components: componentMap,
        embedUrlTemplate: `https://github.com/${owner}/${repo}/blob/${commitSha}/{component}/{file}.png?raw=true`,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e.stderr || e.message || String(e));
  process.exit(1);
});
