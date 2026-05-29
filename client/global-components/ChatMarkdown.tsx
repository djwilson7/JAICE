import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatMarkdownProps = {
  content: string;
  isLightMode?: boolean;
};

export function ChatMarkdown({ content, isLightMode = true }: ChatMarkdownProps) {
  // Dynamic high-contrast colors for inline styles
  const headerColor = isLightMode ? "#0f172a" : "#ffffff"; // slate-950 / white
  const subHeaderColor = isLightMode ? "#1e293b" : "#f1f5f9"; // slate-900 / slate-100
  const bodyColor = isLightMode ? "#334155" : "#e2e8f0"; // slate-800 / slate-200
  const strongColor = isLightMode ? "#0f172a" : "#ffffff";
  const blockquoteBorder = isLightMode ? "#38bdf8" : "#0ea5e9"; // sky-400 / sky-500
  const blockquoteColor = isLightMode ? "#475569" : "#cbd5e1"; // slate-600 / slate-300
  const blockquoteBg = "rgba(56, 189, 248, 0.05)";
  
  const codeInlineBg = isLightMode ? "rgba(226, 232, 240, 0.5)" : "rgba(30, 41, 59, 0.6)";
  const codeInlineBorder = isLightMode ? "rgba(203, 213, 225, 0.3)" : "rgba(71, 85, 105, 0.3)";
  const codeInlineColor = isLightMode ? "#0369a1" : "#7dd3fc"; // sky-700 / sky-300

  const codeBlockBg = isLightMode ? "#0f172a" : "#000000";
  const codeBlockBorder = isLightMode ? "rgba(30, 41, 59, 0.8)" : "#1e293b";

  const tableBg = isLightMode ? "#f8fafc" : "#0f172a";
  const tableBorder = isLightMode ? "#e2e8f0" : "#1e293b";

  return (
    <div 
      style={{
        fontSize: "12px",
        lineHeight: "1.45",
        color: isLightMode ? "#0f172a" : "#f1f5f9",
        textAlign: "left"
      }}
      className="chat-markdown"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 
              style={{
                fontSize: "13.5px",
                fontWeight: "bold",
                margin: "10px 0 4px",
                color: headerColor,
                lineHeight: "1.25"
              }}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 
              style={{
                fontSize: "12.5px",
                fontWeight: "bold",
                margin: "8px 0 4px",
                color: subHeaderColor,
                lineHeight: "1.25"
              }}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                margin: "6px 0 2px",
                color: subHeaderColor,
                lineHeight: "1.25"
              }}
            >
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p 
              style={{
                fontSize: "12px",
                lineHeight: "1.45",
                margin: "4px 0",
                color: bodyColor
              }}
            >
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul 
              style={{
                margin: "4px 0",
                paddingLeft: "14px",
                listStyleType: "disc"
              }}
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol 
              style={{
                margin: "4px 0",
                paddingLeft: "14px",
                listStyleType: "decimal"
              }}
            >
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li 
              style={{
                fontSize: "12px",
                lineHeight: "1.45",
                margin: "2px 0",
                color: bodyColor,
                paddingLeft: "2px"
              }}
            >
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong 
              style={{
                fontWeight: "600",
                color: strongColor
              }}
            >
              {children}
            </strong>
          ),
          blockquote: ({ children }) => (
            <blockquote 
              style={{
                margin: "6px 0",
                paddingLeft: "10px",
                paddingTop: "2px",
                paddingBottom: "2px",
                borderLeft: `2.5px solid ${blockquoteBorder}`,
                backgroundColor: blockquoteBg,
                fontSize: "11px",
                color: blockquoteColor,
                fontStyle: "italic"
              }}
            >
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = Boolean(className);

            if (isBlock) {
              return (
                <code 
                  style={{
                    display: "block",
                    overflowX: "auto",
                    borderRadius: "6px",
                    backgroundColor: codeBlockBg,
                    border: `1px solid ${codeBlockBorder}`,
                    padding: "6px 8px",
                    fontSize: "10.5px",
                    lineHeight: "1.38",
                    color: "#f1f5f9",
                    fontFamily: "monospace"
                  }}
                >
                  {children}
                </code>
              );
            }

            return (
              <code 
                style={{
                  borderRadius: "3px",
                  backgroundColor: codeInlineBg,
                  border: `1px solid ${codeInlineBorder}`,
                  padding: "1px 3px",
                  fontSize: "10px",
                  color: codeInlineColor,
                  fontFamily: "monospace"
                }}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre 
              style={{
                margin: "6px 0",
                overflowX: "auto",
                borderRadius: "6px",
                padding: "0",
                backgroundColor: codeBlockBg,
                border: `1px solid ${codeBlockBorder}`
              }}
            >
              {children}
            </pre>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              style={{
                fontWeight: "500",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
                color: isLightMode ? "#0284c7" : "#38bdf8" // sky-600 / sky-400
              }}
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div style={{ margin: "6px 0", overflowX: "auto" }}>
              <table 
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "11px",
                  border: `1px solid ${tableBorder}`
                }}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th 
              style={{
                border: `1px solid ${tableBorder}`,
                backgroundColor: tableBg,
                padding: "4px 6px",
                textAlign: "left",
                fontWeight: "600",
                color: headerColor
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td 
              style={{
                border: `1px solid ${tableBorder}`,
                padding: "4px 6px",
                verticalAlign: "top",
                color: bodyColor
              }}
            >
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
