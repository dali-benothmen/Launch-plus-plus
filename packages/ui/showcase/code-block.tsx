// biome-ignore-all lint/suspicious/noArrayIndexKey: positional keys match the static syntax tree.
import { Highlight, themes } from "prism-react-renderer";

export interface CodeBlockProps {
  readonly code: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
  return (
    <Highlight code={code.trim()} language="tsx" theme={themes.github}>
      {({ className, getLineProps, getTokenProps, style, tokens }) => (
        <pre className={`${className} showcase-code`} style={style}>
          {tokens.map((line, lineIndex) => (
            <span
              {...getLineProps({ line })}
              className="showcase-code-line"
              key={`line-${lineIndex}`}
            >
              {line.map((token, tokenIndex) => (
                <span {...getTokenProps({ token })} key={`token-${lineIndex}-${tokenIndex}`} />
              ))}
            </span>
          ))}
        </pre>
      )}
    </Highlight>
  );
}
