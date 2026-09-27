import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { Flex } from "./components/flex/index.js";
import { Typography } from "./components/typography/index.js";

interface PluginSurfaceLayoutProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly actions?: ReactNode;
  readonly description?: ReactNode;
  readonly footer?: ReactNode;
  readonly title?: ReactNode;
}

function PluginSurfaceHeader({
  actions,
  description,
  title,
}: Pick<PluginSurfaceLayoutProps, "actions" | "description" | "title">) {
  if (title === undefined && description === undefined && actions === undefined) return null;
  return (
    <Flex
      align="flex-start"
      className="launch-ui-plugin-surface-header"
      gap="medium"
      justify="space-between"
    >
      <div className="launch-ui-plugin-surface-heading">
        {title === undefined ? null : <Typography.Title level={3}>{title}</Typography.Title>}
        {description === undefined ? null : (
          <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
        )}
      </div>
      {actions === undefined ? null : (
        <Flex align="center" className="launch-ui-plugin-surface-actions" gap="small" wrap>
          {actions}
        </Flex>
      )}
    </Flex>
  );
}

function layoutContents(props: PluginSurfaceLayoutProps) {
  return (
    <>
      <PluginSurfaceHeader
        actions={props.actions}
        description={props.description}
        title={props.title}
      />
      <div className="launch-ui-plugin-surface-body">{props.children}</div>
      {props.footer === undefined ? null : (
        <footer className="launch-ui-plugin-surface-footer">{props.footer}</footer>
      )}
    </>
  );
}

export const PluginPageLayout = forwardRef<HTMLElement, PluginSurfaceLayoutProps>(
  function PluginPageLayout(
    { actions, children, className, description, footer, title, ...props },
    ref,
  ) {
    const content = { actions, children, description, footer, title };
    return (
      <main
        {...props}
        className={["launch-ui-plugin-surface", "is-page", className].filter(Boolean).join(" ")}
        ref={ref}
      >
        {layoutContents(content)}
      </main>
    );
  },
);

export const PluginPanelLayout = forwardRef<HTMLElement, PluginSurfaceLayoutProps>(
  function PluginPanelLayout(
    { actions, children, className, description, footer, title, ...props },
    ref,
  ) {
    const content = { actions, children, description, footer, title };
    return (
      <section
        {...props}
        className={["launch-ui-plugin-surface", "is-panel", className].filter(Boolean).join(" ")}
        ref={ref}
      >
        {layoutContents(content)}
      </section>
    );
  },
);

export const PluginSettingsLayout = forwardRef<HTMLElement, PluginSurfaceLayoutProps>(
  function PluginSettingsLayout(
    { actions, children, className, description, footer, title, ...props },
    ref,
  ) {
    const content = { actions, children, description, footer, title };
    return (
      <main
        {...props}
        className={["launch-ui-plugin-surface", "is-settings", className].filter(Boolean).join(" ")}
        ref={ref}
      >
        {layoutContents(content)}
      </main>
    );
  },
);

export interface PluginSurfaceSectionProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  readonly actions?: ReactNode;
  readonly title?: ReactNode;
}

export const PluginSurfaceSection = forwardRef<HTMLElement, PluginSurfaceSectionProps>(
  function PluginSurfaceSection({ actions, children, className, title, ...props }, ref) {
    return (
      <section
        {...props}
        className={["launch-ui-plugin-surface-section", className].filter(Boolean).join(" ")}
        ref={ref}
      >
        {title === undefined && actions === undefined ? null : (
          <Flex align="center" gap="small" justify="space-between">
            {title === undefined ? (
              <span />
            ) : (
              <Typography.Title level={5}>{title}</Typography.Title>
            )}
            {actions}
          </Flex>
        )}
        <div className="launch-ui-plugin-surface-section-body">{children}</div>
      </section>
    );
  },
);

export type { PluginSurfaceLayoutProps };
