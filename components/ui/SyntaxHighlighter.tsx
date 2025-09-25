"use client";

import { useEffect } from "react";
import Prism from "prismjs";

// Import common language grammars
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-scss";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";

// Import theme (you can change this)
import "prismjs/themes/prism-tomorrow.css";

interface SyntaxHighlighterProps {
  code: string;
  language: string;
  className?: string;
  showLineNumbers?: boolean;
}

const getLanguage = (fileExtension: string): string => {
  const extensionMap: { [key: string]: string } = {
    ".js": "javascript",
    ".mjs": "javascript",
    ".jsx": "jsx",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".json": "json",
    ".css": "css",
    ".scss": "scss",
    ".sass": "scss",
    ".md": "markdown",
    ".markdown": "markdown",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".py": "python",
    ".sh": "bash",
    ".bash": "bash",
    ".sql": "sql",
    ".html": "html",
    ".htm": "html",
    ".xml": "xml",
  };

  return extensionMap[fileExtension.toLowerCase()] || "plain";
};

export function SyntaxHighlighter({
  code,
  language,
  className = "",
  showLineNumbers = true,
}: SyntaxHighlighterProps) {
  useEffect(() => {
    Prism.highlightAll();
  }, [code, language]);

  const prismLanguage = language === "text" ? "plain" : language;

  return (
    <div className={`relative ${className}`}>
      <pre
        className={`
          ${showLineNumbers ? "line-numbers" : ""} 
          !bg-gray-900 !text-gray-100 
          rounded-md overflow-auto 
          text-sm
          max-h-96
        `}
        style={{
          margin: 0,
          padding: "1rem",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        <code className={`language-${prismLanguage}`}>
          {code}
        </code>
      </pre>
    </div>
  );
}

export { getLanguage };
