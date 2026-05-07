import { useCallback, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  mode: "truncate" | "full";
  onCheckboxToggle?: (checkboxIndex: number) => void;
  className?: string;
}

export function MarkdownRenderer({
  content,
  mode,
  onCheckboxToggle,
  className = "",
}: MarkdownRendererProps) {
  // Local counter — reset each render, incremented by each checkbox input renderer
  let checkboxIndex = 0;

  const wrapperClasses =
    mode === "truncate" ? `line-clamp-3 ${className}` : className;

  const handleCheckboxClick = useCallback(
    (index: number) => {
      onCheckboxToggle?.(index);
    },
    [onCheckboxToggle],
  );

  return (
    <div className={wrapperClasses} data-testid="markdown-renderer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-amber-900 mb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-amber-900 mb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold text-amber-900 mb-1">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-sm text-gray-900 mb-1">{children}</p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside ml-2 text-sm text-gray-900">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside ml-2 text-sm text-gray-900">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => {
            const isTaskItem =
              typeof props.className === "string" &&
              props.className.includes("task-list-item");
            return (
              <li
                className={
                  isTaskItem
                    ? "list-none flex items-start gap-1.5 my-0.5"
                    : "my-0.5"
                }
              >
                {children}
              </li>
            );
          },
          code: ({ children, className: codeClassName }) => {
            const isBlock =
              typeof codeClassName === "string" &&
              codeClassName.startsWith("language-");
            if (isBlock) {
              return (
                <code className="block bg-gray-900 text-green-400 rounded p-2 text-xs overflow-x-auto my-1">
                  {children}
                </code>
              );
            }
            return (
              <code className="bg-gray-100 rounded px-1 text-xs">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-1">{children}</pre>,
          input: (props: ComponentPropsWithoutRef<"input">) => {
            if (props.type !== "checkbox") {
              return <input {...props} />;
            }
            const currentIndex = checkboxIndex++;
            if (mode === "truncate") {
              return (
                <input
                  type="checkbox"
                  checked={props.checked ?? false}
                  disabled
                  className="w-4 h-4 accent-amber-600"
                  readOnly
                />
              );
            }
            return (
              <input
                type="checkbox"
                checked={props.checked ?? false}
                className="w-4 h-4 accent-amber-600 cursor-pointer"
                onChange={() => handleCheckboxClick(currentIndex)}
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
