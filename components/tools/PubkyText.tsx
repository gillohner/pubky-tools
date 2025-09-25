"use client";

import { MouseEvent } from "react";

interface PubkyTextProps {
  text: string;
  onLinkClick?: (url: string) => void;
  className?: string;
}

export function PubkyText(
  { text, onLinkClick, className = "" }: PubkyTextProps,
) {
  // Regex to match pubky:// URLs
  const pubkyUrlRegex = /(pubky:\/\/[a-zA-Z0-9]+[^\s]*)/g;

  const handleLinkClick = (event: MouseEvent<HTMLSpanElement>, url: string) => {
    event.preventDefault();
    event.stopPropagation();

    if (onLinkClick) {
      onLinkClick(url);
    } else {
      // Default behavior: copy to clipboard
      navigator.clipboard.writeText(url).catch(console.error);
    }
  };

  const renderTextWithLinks = (inputText: string) => {
    const parts = inputText.split(pubkyUrlRegex);
    const elements = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (part.match(pubkyUrlRegex)) {
        // This is a pubky:// URL
        elements.push(
          <span
            key={i}
            className="text-blue-600 dark:text-blue-400 underline cursor-pointer hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            onClick={(e) => handleLinkClick(e, part)}
            title={onLinkClick ? "Click to navigate" : "Click to copy"}
          >
            {part}
          </span>,
        );
      } else if (part) {
        // Regular text
        elements.push(
          <span key={i}>{part}</span>,
        );
      }
    }

    return elements;
  };

  return (
    <span className={className}>
      {renderTextWithLinks(text)}
    </span>
  );
}

interface PubkyCodeBlockProps {
  code: string;
  onLinkClick?: (url: string) => void;
  className?: string;
}

export function PubkyCodeBlock(
  { code, onLinkClick, className = "" }: PubkyCodeBlockProps,
) {
  const lines = code.split("\n");

  return (
    <pre
      className={`bg-gray-100 dark:bg-gray-800 rounded p-4 overflow-x-auto ${className}`}
    >
      <code>
        {lines.map((line, index) => (
          <div key={index} className="block">
            <PubkyText text={line} onLinkClick={onLinkClick} />
            {index < lines.length - 1 && '\n'}
          </div>
        ))}
      </code>
    </pre>
  );
}
