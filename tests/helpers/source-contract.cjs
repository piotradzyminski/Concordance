"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT } = require("./browser-runtime.cjs");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

function extractFunctionSource(source, functionName) {
  const marker = `function ${functionName}`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Function not found: ${functionName}`);
  const parameterStart = source.indexOf("(", start + marker.length);
  if (parameterStart < 0) throw new Error(`Function parameters not found: ${functionName}`);

  let parameterDepth = 0;
  let quote = "";
  let escaped = false;
  let parameterEnd = -1;
  for (let index = parameterStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "(") parameterDepth += 1;
    if (character === ")") {
      parameterDepth -= 1;
      if (parameterDepth === 0) {
        parameterEnd = index;
        break;
      }
    }
  }
  if (parameterEnd < 0) throw new Error(`Unterminated parameters: ${functionName}`);

  const bodyStart = source.indexOf("{", parameterEnd);
  if (bodyStart < 0) throw new Error(`Function body not found: ${functionName}`);
  let depth = 0;
  quote = "";
  escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unterminated function: ${functionName}`);
}

module.exports = { readProjectFile, extractFunctionSource };
