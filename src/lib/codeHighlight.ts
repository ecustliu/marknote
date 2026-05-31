import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

const ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  html: "xml",
  htm: "xml",
  md: "markdown",
};

const AUTO_LANGS = [
  "javascript",
  "typescript",
  "python",
  "sql",
  "json",
  "bash",
  "css",
  "xml",
  "markdown",
  "java",
  "go",
  "rust",
  "yaml",
] as const;

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("json", json);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("css", css);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("java", java);
hljs.registerLanguage("go", go);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("yaml", yaml);

function resolveLanguage(lang?: string | null): string | null {
  if (!lang) return null;
  const raw = lang.trim().toLowerCase().split(/[{[\s]/)[0];
  const name = ALIASES[raw] ?? raw;
  return hljs.getLanguage(name) ? name : null;
}

/** 将代码块转为 highlight.js HTML（预览 / PDF 导出共用） */
export function highlightCode(text: string, lang?: string | null): { html: string; language: string | null } {
  const language = resolveLanguage(lang);
  if (language) {
    return { html: hljs.highlight(text, { language }).value, language };
  }
  const auto = hljs.highlightAuto(text, [...AUTO_LANGS]);
  return { html: auto.value, language: auto.language ?? null };
}
