INSERT INTO installations (id, created_at)
VALUES ('fixture-installation', 1700000000000);

INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt)
VALUES ('fixture-owner', 'Fixture Owner', 'fixture@launchpp.test', 1, '2023-11-14T22:13:20.000Z', '2023-11-14T22:13:20.000Z');

INSERT INTO workspaces (
  id, installation_id, slug, name, created_by_user_id, created_at, updated_at, revision
)
VALUES (
  'fixture-workspace', 'fixture-installation', 'fixture-workspace', 'Fixture Workspace',
  'fixture-owner', 1700000000000, 1700000000000, 1
);

INSERT INTO user_profiles (
  user_id, display_name, locale, time_zone, current_workspace_id, created_at, updated_at, revision
)
VALUES (
  'fixture-owner', 'Fixture Owner', 'en', 'UTC', 'fixture-workspace',
  1700000000000, 1700000000000, 1
);

INSERT INTO workspace_members (workspace_id, user_id, role, state, joined_at, updated_at)
VALUES ('fixture-workspace', 'fixture-owner', 'owner', 'active', 1700000000000, 1700000000000);

INSERT INTO projects (
  id, workspace_id, key, slug, name, description, access, position, next_task_number,
  created_by_user_id, created_at, updated_at, revision
)
VALUES (
  'fixture-project', 'fixture-workspace', 'FIX', 'fixture-project', 'Fixture Project',
  'Preserved across the core migration.', 'workspace', 0, 1,
  'fixture-owner', 1700000000000, 1700000000000, 1
);

INSERT INTO project_statuses (
  id, workspace_id, project_id, name, color, position, category, created_at, updated_at, revision
)
VALUES
  ('fixture-todo', 'fixture-workspace', 'fixture-project', 'To do', '#8c8c8c', 0, 'backlog', 1700000000000, 1700000000000, 1),
  ('fixture-progress', 'fixture-workspace', 'fixture-project', 'In progress', '#1668dc', 1, 'active', 1700000000000, 1700000000000, 1),
  ('fixture-done', 'fixture-workspace', 'fixture-project', 'Done', '#52c41a', 2, 'done', 1700000000000, 1700000000000, 1);
