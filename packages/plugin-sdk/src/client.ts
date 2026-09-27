import type { PluginContext } from "@launchpp/plugin-protocol";
import type { CapabilityRequestOptions, PluginTransport } from "./transport.js";
import { BrowserMessageTransport, type BrowserMessageTransportOptions } from "./transport.js";
import type {
  CreateProjectInput,
  CreateTaskCommentInput,
  CreateTaskInput,
  NavigationTarget,
  PluginTheme,
  Project,
  Task,
  TaskComment,
  UpdateProjectInput,
  UpdateTaskInput,
} from "./types.js";

export const SDK_CAPABILITIES = {
  commentsCreate: "comments.create",
  commentsList: "comments.list",
  commandsInvoke: "commands.invoke",
  navigationBack: "navigation.back",
  navigationOpen: "navigation.open",
  projectsCreate: "projects.create",
  projectsList: "projects.list",
  projectsUpdate: "projects.update",
  tasksCreate: "tasks.create",
  tasksGet: "tasks.get",
  tasksList: "tasks.list",
  tasksUpdate: "tasks.update",
} as const;

export interface ProjectClient {
  create(input: CreateProjectInput, options?: CapabilityRequestOptions): Promise<Project>;
  list(options?: CapabilityRequestOptions): Promise<readonly Project[]>;
  update(input: UpdateProjectInput, options?: CapabilityRequestOptions): Promise<Project>;
}

export interface TaskClient {
  create(input: CreateTaskInput, options?: CapabilityRequestOptions): Promise<Task>;
  get(taskId: string, options?: CapabilityRequestOptions): Promise<Task>;
  list(options?: CapabilityRequestOptions): Promise<readonly Task[]>;
  update(input: UpdateTaskInput, options?: CapabilityRequestOptions): Promise<Task>;
}

export interface CommentClient {
  create(input: CreateTaskCommentInput, options?: CapabilityRequestOptions): Promise<TaskComment>;
  list(taskId: string, options?: CapabilityRequestOptions): Promise<readonly TaskComment[]>;
}

export interface NavigationClient {
  back(options?: CapabilityRequestOptions): Promise<void>;
  open(target: NavigationTarget, options?: CapabilityRequestOptions): Promise<void>;
}

export interface CommandClient {
  invoke<Input = unknown, Output = unknown>(
    command: string,
    input: Input,
    options?: CapabilityRequestOptions,
  ): Promise<Output>;
}

export interface ThemeClient {
  readonly current: PluginTheme;
}

export interface LaunchppClient {
  readonly comments: CommentClient;
  readonly commands: CommandClient;
  readonly context: PluginContext;
  readonly navigation: NavigationClient;
  readonly projects: ProjectClient;
  readonly tasks: TaskClient;
  readonly theme: ThemeClient;
  close(): void;
  invoke<Output = unknown>(
    capability: string,
    input: unknown,
    options?: CapabilityRequestOptions,
  ): Promise<Output>;
}

export interface CreateClientOptions extends BrowserMessageTransportOptions {
  readonly signal?: AbortSignal;
  readonly transport?: PluginTransport;
}

class LaunchppClientImplementation implements LaunchppClient {
  readonly comments: CommentClient;
  readonly commands: CommandClient;
  readonly context: PluginContext;
  readonly navigation: NavigationClient;
  readonly projects: ProjectClient;
  readonly tasks: TaskClient;
  readonly theme: ThemeClient;
  readonly #transport: PluginTransport;

  constructor(transport: PluginTransport, context: PluginContext) {
    this.#transport = transport;
    this.context = context;
    this.theme = Object.freeze({ current: context.theme });
    this.projects = Object.freeze({
      create: (input: CreateProjectInput, options?: CapabilityRequestOptions) =>
        this.invoke<Project>(SDK_CAPABILITIES.projectsCreate, input, options),
      list: (options?: CapabilityRequestOptions) =>
        this.invoke<readonly Project[]>(SDK_CAPABILITIES.projectsList, {}, options),
      update: (input: UpdateProjectInput, options?: CapabilityRequestOptions) =>
        this.invoke<Project>(SDK_CAPABILITIES.projectsUpdate, input, options),
    });
    this.tasks = Object.freeze({
      create: (input: CreateTaskInput, options?: CapabilityRequestOptions) =>
        this.invoke<Task>(SDK_CAPABILITIES.tasksCreate, input, options),
      get: (taskId: string, options?: CapabilityRequestOptions) =>
        this.invoke<Task>(SDK_CAPABILITIES.tasksGet, { taskId }, options),
      list: (options?: CapabilityRequestOptions) =>
        this.invoke<readonly Task[]>(SDK_CAPABILITIES.tasksList, {}, options),
      update: (input: UpdateTaskInput, options?: CapabilityRequestOptions) =>
        this.invoke<Task>(SDK_CAPABILITIES.tasksUpdate, input, options),
    });
    this.comments = Object.freeze({
      create: (input: CreateTaskCommentInput, options?: CapabilityRequestOptions) =>
        this.invoke<TaskComment>(SDK_CAPABILITIES.commentsCreate, input, options),
      list: (taskId: string, options?: CapabilityRequestOptions) =>
        this.invoke<readonly TaskComment[]>(SDK_CAPABILITIES.commentsList, { taskId }, options),
    });
    this.navigation = Object.freeze({
      back: async (options?: CapabilityRequestOptions) => {
        await this.invoke(SDK_CAPABILITIES.navigationBack, {}, options);
      },
      open: async (target: NavigationTarget, options?: CapabilityRequestOptions) => {
        await this.invoke(SDK_CAPABILITIES.navigationOpen, target, options);
      },
    });
    this.commands = Object.freeze({
      invoke: <Input, Output>(command: string, input: Input, options?: CapabilityRequestOptions) =>
        this.invoke<Output>(SDK_CAPABILITIES.commandsInvoke, { command, input }, options),
    });
  }

  invoke<Output = unknown>(
    capability: string,
    input: unknown,
    options?: CapabilityRequestOptions,
  ): Promise<Output> {
    return this.#transport.invoke(capability, input, options) as Promise<Output>;
  }

  close(): void {
    this.#transport.close();
  }
}

export async function createClient(options: CreateClientOptions = {}): Promise<LaunchppClient> {
  const transport =
    options.transport ??
    new BrowserMessageTransport({
      ...(options.applyTheme === undefined ? {} : { applyTheme: options.applyTheme }),
      ...(options.handshakeTimeoutMs === undefined
        ? {}
        : { handshakeTimeoutMs: options.handshakeTimeoutMs }),
      ...(options.hostOrigin === undefined ? {} : { hostOrigin: options.hostOrigin }),
      ...(options.maxMessageBytes === undefined
        ? {}
        : { maxMessageBytes: options.maxMessageBytes }),
      ...(options.onProtocolError === undefined
        ? {}
        : { onProtocolError: options.onProtocolError }),
      ...(options.window === undefined ? {} : { window: options.window }),
    });
  const context = await transport.connect({
    ...(options.signal ? { signal: options.signal } : {}),
  });
  return new LaunchppClientImplementation(transport, context);
}
