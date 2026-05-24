#!/usr/bin/env node
/**
 * PreToolUse hook for LeanKG - Routing guidance for Claude Code
 * Shows nudges when users reach for native tools instead of LeanKG.
 */
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

const raw = await readStdin();
const input = JSON.parse(raw);
const tool = input.tool_name ?? "";
const toolInput = input.tool_input ?? {};

const GUIDANCE = {
  Read: `
<tool_routing>
Use LeanKG instead of Read for code analysis:
  - mcp__leankg__query_file(filename) - find files by name
  - mcp__leankg__get_context(file) - read with token optimization
</tool_routing>`,

  Grep: `
<tool_routing>
Use LeanKG instead of Grep for code search:
  - mcp__leankg__search_code(query, element_type) - search functions, files, structs
  - mcp__leankg__find_function(name) - locate function definitions
</tool_routing>`,

  Bash: `
<tool_routing>
Use LeanKG instead of Bash for dependency analysis:
  - mcp__leankg__get_impact_radius(file, depth) - blast radius analysis
  - mcp__leankg__get_dependencies(file) - what this file imports
  - mcp__leankg__get_dependents(file) - what depends on this file
</tool_routing>`,
};

function isCodeAnalysis(tool, toolInput) {
  if (tool === "Read") {
    const path = toolInput.file_path ?? toolInput.path ?? "";
    const codeExts = [".rs", ".go", ".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".cpp", ".c", ".h", ".cs", ".rb"];
    return codeExts.some(ext => path.endsWith(ext));
  }
  if (tool === "Bash") {
    const cmd = toolInput.command ?? "";
    return /\b(grep|find|rg|ag|ack)\b/.test(cmd) || /\b(import|require|use|from)\b/.test(cmd);
  }
  return true;
}

if (GUIDANCE[tool] && isCodeAnalysis(tool, toolInput)) {
  const response = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      guidance: GUIDANCE[tool].trim(),
    },
  };
  process.stdout.write(JSON.stringify(response) + "\n");
}
