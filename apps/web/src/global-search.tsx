import type { SearchResult } from "@launchpp/api-client";
import { Button, Empty, Input, List, Modal, Spin, Tag, Typography } from "@launchpp/ui";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useApiClient } from "./api-client-context.js";

export interface GlobalSearchProps {
  readonly onClose: () => void;
  readonly open: boolean;
}

export function GlobalSearch({ onClose, open }: GlobalSearchProps) {
  const api = useApiClient();
  const navigate = useNavigate();
  const requestId = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError(undefined);
      return;
    }
    const value = query.trim();
    if (!value) {
      setResults([]);
      setLoading(false);
      setError(undefined);
      return;
    }
    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(undefined);
      void api
        .search({ limit: 20, q: value })
        .then((response) => {
          if (requestId.current === currentRequest) setResults(response.items);
        })
        .catch((reason: unknown) => {
          if (requestId.current === currentRequest) {
            setResults([]);
            setError(reason instanceof Error ? reason.message : "Search is unavailable.");
          }
        })
        .finally(() => {
          if (requestId.current === currentRequest) setLoading(false);
        });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [api, open, query]);

  const openResult = (result: SearchResult) => {
    const root = `/app/workspaces/${result.workspaceId}/projects/${result.projectId}`;
    navigate(result.kind === "task" ? `${root}/board/tasks/${result.resourceId}` : `${root}/board`);
    onClose();
  };

  return (
    <Modal footer={null} onCancel={onClose} open={open} title="Search" width={620}>
      <div className="global-search">
        <Input.Search
          allowClear
          autoFocus
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search projects and tasks"
          value={query}
        />
        {loading ? (
          <div className="global-search-state">
            <Spin size="small" />
          </div>
        ) : error ? (
          <Typography.Text type="danger">{error}</Typography.Text>
        ) : query.trim() && results.length === 0 ? (
          <Empty description="No matching projects or tasks" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : results.length > 0 ? (
          <List
            className="global-search-results"
            itemRender={(result) => (
              <Button
                block
                className="global-search-result"
                onClick={() => openResult(result)}
                variant="text"
              >
                <span>
                  <Typography.Text strong>{result.title}</Typography.Text>
                  <Typography.Text type="secondary">{result.subtitle}</Typography.Text>
                </span>
                <Tag>{result.kind === "task" ? "Task" : "Project"}</Tag>
              </Button>
            )}
            items={results}
            rowKey="resourceId"
          />
        ) : (
          <Typography.Text type="secondary">Start typing to search.</Typography.Text>
        )}
      </div>
    </Modal>
  );
}
