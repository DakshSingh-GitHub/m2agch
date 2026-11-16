"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API might be unavailable in restricted contexts
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-[#262930] bg-[#121316] shadow-[inset_0_2px_6px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between border-b border-[#262930] bg-[#17191D] px-3.5 py-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#9CA3AF]">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#262930] bg-[#22252B] px-2.5 py-1 font-mono text-[11px] text-[#F3F4F6] transition-colors hover:border-[#343944] hover:bg-[#2A2E36] active:translate-y-px cursor-pointer"
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-[#34D399]" />
              <span className="text-[#34D399]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 text-[#9CA3AF]" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-[13px] leading-relaxed text-[#F3F4F6]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Matches: `inline code`, **bold**, __bold__, *italic*, _italic_, ~~strike~~, [label](https://...)
  const pattern =
    /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|\*[^*\n]+\*|(?<!\w)_[^_\n]+_(?!\w)|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${idx++}`;

    if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded-md border border-[#262930] bg-[#22252B] px-1.5 py-0.5 font-mono text-[0.86em] text-[#F3F4F6]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      nodes.push(
        <strong key={key} className="font-semibold text-[#F3F4F6]">
          {renderInline(token.slice(2, -2), `${key}-b`)}
        </strong>
      );
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      nodes.push(
        <del key={key} className="text-[#9CA3AF] line-through">
          {renderInline(token.slice(2, -2), `${key}-s`)}
        </del>
      );
    } else if (
      (token.startsWith("*") && token.endsWith("*")) ||
      (token.startsWith("_") && token.endsWith("_"))
    ) {
      nodes.push(
        <em key={key} className="italic text-[#E5E7EB]">
          {renderInline(token.slice(1, -1), `${key}-i`)}
        </em>
      );
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#60A5FA] underline decoration-[#60A5FA]/40 underline-offset-2 hover:decoration-[#60A5FA]"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(token);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

type Block =
  | { type: "code"; language: string; code: string }
  | { type: "heading"; level: number; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "blockquote"; lines: string[] }
  | { type: "hr" }
  | { type: "paragraph"; lines: string[] };

function parseMarkdownBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block (handles unclosed fences gracefully during streaming)
    const fenceOpen = line.match(/^\s*```([a-zA-Z0-9_+-]*)\s*$/);
    if (fenceOpen) {
      const language = fenceOpen[1] || "";
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && /^\s*```\s*$/.test(lines[i])) {
        i += 1;
      }
      blocks.push({ type: "code", language, code: codeLines.join("\n") });
      continue;
    }

    // Blank line
    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    // Heading (# through ####)
    const headingMatch = line.match(/^\s*(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i += 1;
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Paragraph (collect until blank line or block starter)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^\s*```/.test(lines[i]) &&
      !/^\s*#{1,4}\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", lines: paraLines });
    }
  }

  return blocks;
}

export function MarkdownRenderer({ content }: { content: string }) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-2.5 text-[14.5px] leading-relaxed text-[#F3F4F6]">
      {blocks.map((block, index) => {
        const key = `blk-${index}`;

        switch (block.type) {
          case "code":
            return <CodeBlock key={key} language={block.language} code={block.code} />;

          case "heading": {
            const headingClasses: Record<number, string> = {
              1: "mt-3 text-lg font-bold tracking-tight text-[#F3F4F6]",
              2: "mt-3 text-base font-semibold tracking-tight text-[#F3F4F6]",
              3: "mt-2.5 text-[15px] font-semibold text-[#F3F4F6]",
              4: "mt-2 text-sm font-semibold text-[#E5E7EB]",
            };
            const cls = headingClasses[block.level] ?? headingClasses[3];
            return (
              <div key={key} className={cls}>
                {renderInline(block.text, key)}
              </div>
            );
          }

          case "ul":
            return (
              <ul key={key} className="my-1.5 list-disc space-y-1.5 pl-5 text-[#E5E7EB]">
                {block.items.map((item, idx) => (
                  <li key={`${key}-li-${idx}`} className="leading-relaxed">
                    {renderInline(item, `${key}-li-${idx}`)}
                  </li>
                ))}
              </ul>
            );

          case "ol":
            return (
              <ol key={key} className="my-1.5 list-decimal space-y-1.5 pl-5 text-[#E5E7EB]">
                {block.items.map((item, idx) => (
                  <li key={`${key}-oli-${idx}`} className="leading-relaxed">
                    {renderInline(item, `${key}-oli-${idx}`)}
                  </li>
                ))}
              </ol>
            );

          case "blockquote":
            return (
              <blockquote
                key={key}
                className="my-2 border-l-2 border-[#3A3F4B] bg-[#16181C] px-3.5 py-2 text-[14px] text-[#9CA3AF] rounded-r-lg"
              >
                {block.lines.map((line, idx) => (
                  <p key={`${key}-bq-${idx}`}>{renderInline(line, `${key}-bq-${idx}`)}</p>
                ))}
              </blockquote>
            );

          case "hr":
            return <hr key={key} className="my-3 border-[#262930]" />;

          case "paragraph":
            return (
              <p key={key} className="whitespace-pre-wrap text-[#E5E7EB]">
                {block.lines.map((line, idx) => (
                  <React.Fragment key={`${key}-p-${idx}`}>
                    {idx > 0 && "\n"}
                    {renderInline(line, `${key}-p-${idx}`)}
                  </React.Fragment>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}
