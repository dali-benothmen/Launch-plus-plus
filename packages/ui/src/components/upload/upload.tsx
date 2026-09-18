import {
  type CSSProperties,
  type DragEvent,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "../button/button.js";
import { classes } from "../internal/classes.js";
import { CloseIcon, LoadingIcon } from "../internal/icons.js";

export const UPLOAD_LIST_IGNORE = Symbol("launch-ui-upload-list-ignore");

export type UploadFileStatus = "done" | "error" | "removed" | "uploading";
export type UploadListType = "picture" | "picture-card" | "picture-circle" | "text";
export type UploadSemanticName = "actions" | "item" | "list" | "progress" | "root" | "trigger";
export type UploadClassNames = Partial<Record<UploadSemanticName, string>>;
export type UploadStyles = Partial<Record<UploadSemanticName, CSSProperties>>;

export interface UploadFile<TResponse = unknown> {
  readonly error?: Error;
  readonly name: string;
  readonly originFileObj?: File;
  readonly percent?: number;
  readonly response?: TResponse;
  readonly size?: number;
  readonly status?: UploadFileStatus;
  readonly thumbUrl?: string;
  readonly type?: string;
  readonly uid: string;
  readonly url?: string;
  readonly xhr?: XMLHttpRequest;
}

export interface UploadChangeInfo<TResponse = unknown> {
  readonly event?: { readonly percent: number };
  readonly file: UploadFile<TResponse>;
  readonly fileList: ReadonlyArray<UploadFile<TResponse>>;
}

export interface UploadRequestOptions<TResponse = unknown> {
  readonly action: string;
  readonly data: Record<string, unknown>;
  readonly file: File;
  readonly filename: string;
  readonly headers: Record<string, string>;
  readonly method: "post" | "put";
  readonly onError: (error: Error, response?: unknown) => void;
  readonly onProgress: (event: { readonly percent: number }) => void;
  readonly onSuccess: (response: TResponse, xhr?: XMLHttpRequest) => void;
  readonly withCredentials: boolean;
}

export interface UploadListConfig<TResponse = unknown> {
  readonly downloadIcon?: ReactNode | ((file: UploadFile<TResponse>) => ReactNode);
  readonly extra?: ReactNode | ((file: UploadFile<TResponse>) => ReactNode);
  readonly previewIcon?: ReactNode | ((file: UploadFile<TResponse>) => ReactNode);
  readonly removeIcon?: ReactNode | ((file: UploadFile<TResponse>) => ReactNode);
  readonly showDownloadIcon?: boolean | ((file: UploadFile<TResponse>) => boolean);
  readonly showPreviewIcon?: boolean | ((file: UploadFile<TResponse>) => boolean);
  readonly showRemoveIcon?: boolean | ((file: UploadFile<TResponse>) => boolean);
}

export interface UploadItemActions {
  readonly download: () => void;
  readonly preview: () => void;
  readonly remove: () => void;
}

export interface UploadProps<TResponse = unknown>
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "onDrop"> {
  readonly accept?: string | { readonly format: string };
  readonly action?: string | ((file: File) => Promise<string> | string);
  readonly beforeUpload?: (
    file: File,
    fileList: ReadonlyArray<File>,
  ) =>
    | boolean
    | Blob
    | File
    | Promise<boolean | Blob | File | typeof UPLOAD_LIST_IGNORE>
    | typeof UPLOAD_LIST_IGNORE;
  readonly children?: ReactNode;
  readonly classNames?:
    | UploadClassNames
    | ((info: { readonly props: UploadProps<TResponse> }) => UploadClassNames);
  readonly customRequest?: (options: UploadRequestOptions<TResponse>) => void;
  readonly data?:
    | Record<string, unknown>
    | ((file: File) => Promise<Record<string, unknown>> | Record<string, unknown>);
  readonly defaultFileList?: ReadonlyArray<UploadFile<TResponse>>;
  readonly directory?: boolean;
  readonly disabled?: boolean;
  readonly fileList?: ReadonlyArray<UploadFile<TResponse>>;
  readonly headers?: Record<string, string>;
  readonly iconRender?: (file: UploadFile<TResponse>, listType: UploadListType) => ReactNode;
  readonly isImageUrl?: (file: UploadFile<TResponse>) => boolean;
  readonly itemRender?: (
    originNode: ReactElement,
    file: UploadFile<TResponse>,
    fileList: ReadonlyArray<UploadFile<TResponse>>,
    actions: UploadItemActions,
  ) => ReactNode;
  readonly listType?: UploadListType;
  readonly maxCount?: number;
  readonly method?: "post" | "put";
  readonly multiple?: boolean;
  readonly name?: string;
  readonly onChange?: (info: UploadChangeInfo<TResponse>) => void;
  readonly onDownload?: (file: UploadFile<TResponse>) => void;
  readonly onDrop?: (event: DragEvent<HTMLDivElement>) => void;
  readonly onPreview?: (file: UploadFile<TResponse>) => void;
  readonly onRemove?: (file: UploadFile<TResponse>) => boolean | Promise<boolean> | undefined;
  readonly openFileDialogOnClick?: boolean;
  readonly pastable?: boolean;
  readonly previewFile?: (file: File | Blob) => Promise<string>;
  readonly showUploadList?: boolean | UploadListConfig<TResponse>;
  readonly styles?:
    | UploadStyles
    | ((info: { readonly props: UploadProps<TResponse> }) => UploadStyles);
  readonly type?: "drag" | "select";
  readonly withCredentials?: boolean;
}

let uploadSequence = 0;

function nextUid() {
  uploadSequence += 1;
  return `launch-upload-${Date.now()}-${uploadSequence}`;
}

function resolveToggle<TResponse>(
  value: boolean | ((file: UploadFile<TResponse>) => boolean) | undefined,
  file: UploadFile<TResponse>,
  fallback: boolean,
) {
  if (typeof value === "function") return value(file);
  return value ?? fallback;
}

function resolveNode<TResponse>(
  value: ReactNode | ((file: UploadFile<TResponse>) => ReactNode),
  file: UploadFile<TResponse>,
) {
  return typeof value === "function" ? value(file) : value;
}

function isImage<TResponse>(file: UploadFile<TResponse>) {
  return file.type?.startsWith("image/") || /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(file.name);
}

function FileGlyph() {
  return (
    <svg aria-hidden="true" className="launch-ui-upload-file-glyph" viewBox="0 0 20 20">
      <path d="M5.5 2.5h5l4 4v11h-9zM10.5 2.5v4h4M7.8 11h4.4M7.8 14h3.2" />
    </svg>
  );
}

function UploadGlyph() {
  return (
    <svg aria-hidden="true" className="launch-ui-upload-glyph" viewBox="0 0 20 20">
      <path d="M10 13V3m0 0L6 7m4-4 4 4M4 12.5v4h12v-4" />
    </svg>
  );
}

function PreviewGlyph() {
  return (
    <svg aria-hidden="true" className="launch-ui-control-icon" viewBox="0 0 16 16">
      <path d="M1.8 8s2.1-3.5 6.2-3.5S14.2 8 14.2 8 12.1 11.5 8 11.5 1.8 8 1.8 8Z" />
      <circle cx="8" cy="8" r="1.6" />
    </svg>
  );
}

function DownloadGlyph() {
  return (
    <svg aria-hidden="true" className="launch-ui-control-icon" viewBox="0 0 16 16">
      <path d="M8 2v8m0 0 3-3m-3 3L5 7M3 13h10" />
    </svg>
  );
}

interface UploadListItemProps<TResponse> {
  readonly actionsClassName?: string | undefined;
  readonly actionsStyle?: CSSProperties | undefined;
  readonly actions: UploadItemActions;
  readonly className?: string | undefined;
  readonly file: UploadFile<TResponse>;
  readonly iconRender?: UploadProps<TResponse>["iconRender"] | undefined;
  readonly isImageUrl?: UploadProps<TResponse>["isImageUrl"] | undefined;
  readonly listConfig: UploadListConfig<TResponse>;
  readonly listType: UploadListType;
  readonly previewFile?: UploadProps<TResponse>["previewFile"] | undefined;
  readonly progressClassName?: string | undefined;
  readonly progressStyle?: CSSProperties | undefined;
  readonly style?: CSSProperties | undefined;
}

function UploadListItem<TResponse>({
  actions,
  actionsClassName,
  actionsStyle,
  className,
  file,
  iconRender,
  isImageUrl,
  listConfig,
  listType,
  previewFile,
  progressClassName,
  progressStyle,
  style,
}: UploadListItemProps<TResponse>) {
  const [generatedPreview, setGeneratedPreview] = useState<string>();
  const shouldShowImage = isImageUrl?.(file) ?? isImage(file);

  useEffect(() => {
    if (!shouldShowImage || file.thumbUrl || file.url || !file.originFileObj) return;
    let active = true;
    let objectUrl: string | undefined;
    const createPreview = async () => {
      if (previewFile) {
        const preview = await previewFile(file.originFileObj as File);
        if (active) setGeneratedPreview(preview);
        return;
      }
      objectUrl = URL.createObjectURL(file.originFileObj as File);
      if (active) setGeneratedPreview(objectUrl);
    };
    void createPreview();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.originFileObj, file.thumbUrl, file.url, previewFile, shouldShowImage]);

  const previewUrl = file.thumbUrl ?? file.url ?? generatedPreview;
  const showPreview = resolveToggle(
    listConfig.showPreviewIcon,
    file,
    Boolean(previewUrl || file.url),
  );
  const showDownload = resolveToggle(listConfig.showDownloadIcon, file, Boolean(file.url));
  const showRemove = resolveToggle(listConfig.showRemoveIcon, file, true);

  return (
    <div
      className={classes(
        "launch-ui-upload-item",
        `is-${listType}`,
        file.status && `is-${file.status}`,
        className,
      )}
      style={style}
    >
      <span className="launch-ui-upload-item-visual">
        {previewUrl && shouldShowImage ? (
          <img alt="" draggable={false} src={previewUrl} />
        ) : (
          (iconRender?.(file, listType) ??
          (file.status === "uploading" ? <LoadingIcon /> : <FileGlyph />))
        )}
      </span>
      <span className="launch-ui-upload-item-content">
        <button className="launch-ui-upload-item-name" onClick={actions.preview} type="button">
          {file.name}
        </button>
        {file.status === "uploading" ? (
          <span
            className={classes("launch-ui-upload-progress-track", progressClassName)}
            style={progressStyle}
          >
            <span style={{ width: `${Math.max(0, Math.min(100, file.percent ?? 0))}%` }} />
          </span>
        ) : null}
        {file.status === "error" ? (
          <span className="launch-ui-upload-error">Upload failed</span>
        ) : null}
        {listConfig.extra ? (
          <span className="launch-ui-upload-extra">{resolveNode(listConfig.extra, file)}</span>
        ) : null}
      </span>
      <span className={classes("launch-ui-upload-actions", actionsClassName)} style={actionsStyle}>
        {showPreview ? (
          <button aria-label={`Preview ${file.name}`} onClick={actions.preview} type="button">
            {listConfig.previewIcon ? resolveNode(listConfig.previewIcon, file) : <PreviewGlyph />}
          </button>
        ) : null}
        {showDownload ? (
          <button aria-label={`Download ${file.name}`} onClick={actions.download} type="button">
            {listConfig.downloadIcon ? (
              resolveNode(listConfig.downloadIcon, file)
            ) : (
              <DownloadGlyph />
            )}
          </button>
        ) : null}
        {showRemove ? (
          <button aria-label={`Remove ${file.name}`} onClick={actions.remove} type="button">
            {listConfig.removeIcon ? resolveNode(listConfig.removeIcon, file) : <CloseIcon />}
          </button>
        ) : null}
      </span>
    </div>
  );
}

function UploadComponent<TResponse = unknown>(uploadProps: UploadProps<TResponse>) {
  const {
    accept,
    action,
    beforeUpload,
    children,
    className,
    classNames: classNamesProp,
    customRequest,
    data,
    defaultFileList = [],
    directory = false,
    disabled = false,
    fileList: controlledFileList,
    headers = {},
    iconRender,
    isImageUrl,
    itemRender,
    listType = "text",
    maxCount,
    method = "post",
    multiple = false,
    name = "file",
    onChange,
    onDownload,
    onDrop,
    onPreview,
    onRemove,
    openFileDialogOnClick = true,
    pastable = false,
    previewFile,
    showUploadList = true,
    style,
    styles: stylesProp,
    type = "select",
    withCredentials = false,
    ...rootProps
  } = uploadProps;
  const [internalFileList, setInternalFileList] =
    useState<ReadonlyArray<UploadFile<TResponse>>>(defaultFileList);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileList = controlledFileList ?? internalFileList;
  const fileListRef = useRef(fileList);
  fileListRef.current = fileList;
  const resolvedClassNames =
    typeof classNamesProp === "function"
      ? classNamesProp({ props: uploadProps })
      : (classNamesProp ?? {});
  const resolvedStyles =
    typeof stylesProp === "function" ? stylesProp({ props: uploadProps }) : (stylesProp ?? {});
  const listConfig = typeof showUploadList === "object" ? showUploadList : {};
  const acceptedFormat = typeof accept === "string" ? accept : accept?.format;

  const announce = (
    nextFileList: ReadonlyArray<UploadFile<TResponse>>,
    file: UploadFile<TResponse>,
    event?: { readonly percent: number },
  ) => {
    fileListRef.current = nextFileList;
    if (controlledFileList === undefined) setInternalFileList(nextFileList);
    onChange?.({ ...(event ? { event } : {}), file, fileList: nextFileList });
  };

  const updateFile = (
    uid: string,
    updates: Partial<UploadFile<TResponse>>,
    event?: { readonly percent: number },
  ) => {
    let changed: UploadFile<TResponse> | undefined;
    const next = fileListRef.current.map((file) => {
      if (file.uid !== uid) return file;
      changed = { ...file, ...updates };
      return changed;
    });
    if (changed) announce(next, changed, event);
  };

  const defaultRequest = (options: UploadRequestOptions<TResponse>) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method.toUpperCase(), options.action);
    xhr.withCredentials = options.withCredentials;
    for (const [header, value] of Object.entries(options.headers))
      xhr.setRequestHeader(header, value);
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable)
        options.onProgress({ percent: (event.loaded / event.total) * 100 });
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        let response: unknown = xhr.responseText;
        try {
          response = JSON.parse(xhr.responseText);
        } catch {
          // Text responses are valid upload responses.
        }
        options.onSuccess(response as TResponse, xhr);
      } else {
        options.onError(new Error(`Upload failed with status ${xhr.status}`), xhr.responseText);
      }
    });
    xhr.addEventListener("error", () => options.onError(new Error("Upload request failed")));
    const body = new FormData();
    for (const [key, value] of Object.entries(options.data)) body.append(key, String(value));
    body.append(options.filename, options.file);
    xhr.send(body);
  };

  const uploadFile = async (entry: UploadFile<TResponse>, source: File) => {
    const resolvedAction = typeof action === "function" ? await action(source) : (action ?? "");
    const resolvedData = typeof data === "function" ? await data(source) : (data ?? {});
    const options: UploadRequestOptions<TResponse> = {
      action: resolvedAction,
      data: resolvedData,
      file: source,
      filename: name,
      headers,
      method,
      onError: (error, response) =>
        updateFile(entry.uid, { error, response: response as TResponse, status: "error" }),
      onProgress: (event) =>
        updateFile(entry.uid, { percent: event.percent, status: "uploading" }, event),
      onSuccess: (response, xhr) =>
        updateFile(entry.uid, {
          percent: 100,
          response,
          status: "done",
          ...(xhr ? { xhr } : {}),
        }),
      withCredentials,
    };
    if (customRequest) customRequest(options);
    else defaultRequest(options);
  };

  const processFiles = async (selectedFiles: ReadonlyArray<File>) => {
    const candidates = multiple || directory ? selectedFiles : selectedFiles.slice(0, 1);
    for (const source of candidates) {
      let beforeResult: boolean | Blob | File | typeof UPLOAD_LIST_IGNORE = true;
      try {
        beforeResult = (await beforeUpload?.(source, candidates)) ?? true;
      } catch {
        beforeResult = false;
      }
      if (beforeResult === UPLOAD_LIST_IGNORE) continue;
      const uploadSource =
        beforeResult instanceof Blob
          ? beforeResult instanceof File
            ? beforeResult
            : new File([beforeResult], source.name, { type: beforeResult.type || source.type })
          : source;
      const willRequest = beforeResult !== false && Boolean(action || customRequest);
      const entry: UploadFile<TResponse> = {
        name: uploadSource.name,
        originFileObj: uploadSource,
        size: uploadSource.size,
        type: uploadSource.type,
        uid: nextUid(),
        ...(willRequest
          ? { percent: 0, status: "uploading" as const }
          : beforeResult === false
            ? {}
            : { status: "done" as const }),
      };
      const existing = fileListRef.current;
      const next =
        maxCount === 1
          ? [entry]
          : maxCount
            ? [...existing, entry].slice(-maxCount)
            : [...existing, entry];
      announce(next, entry);
      if (willRequest) void uploadFile(entry, uploadSource);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = async (file: UploadFile<TResponse>) => {
    try {
      if ((await onRemove?.(file)) === false) return;
    } catch {
      return;
    }
    const removed = { ...file, status: "removed" as const };
    announce(
      fileListRef.current.filter((entry) => entry.uid !== file.uid),
      removed,
    );
  };

  const preview = (file: UploadFile<TResponse>) => {
    if (onPreview) onPreview(file);
    else if (file.url) window.open(file.url, "_blank", "noopener,noreferrer");
  };

  const download = (file: UploadFile<TResponse>) => {
    if (onDownload) onDownload(file);
    else if (file.url) window.open(file.url, "_blank", "noopener,noreferrer");
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    onDrop?.(event);
    if (!disabled) void processFiles(Array.from(event.dataTransfer.files));
  };

  const input = (
    <input
      accept={acceptedFormat}
      aria-hidden="true"
      className="launch-ui-upload-input"
      disabled={disabled}
      multiple={multiple || directory}
      onChange={(event) => void processFiles(Array.from(event.target.files ?? []))}
      ref={(node) => {
        inputRef.current = node;
        if (node && directory) {
          node.setAttribute("webkitdirectory", "");
          node.setAttribute("directory", "");
        }
      }}
      tabIndex={-1}
      type="file"
    />
  );

  const triggerContent =
    children ??
    (listType === "picture-card" || listType === "picture-circle" ? (
      <span className="launch-ui-upload-card-trigger">
        <UploadGlyph />
        <span>Upload</span>
      </span>
    ) : (
      <Button disabled={disabled} icon={<UploadGlyph />}>
        Click to upload
      </Button>
    ));
  const hideTrigger = maxCount !== undefined && fileList.length >= maxCount;

  const renderedList = showUploadList
    ? fileList.map((file) => {
        const actions: UploadItemActions = {
          download: () => download(file),
          preview: () => preview(file),
          remove: () => void removeFile(file),
        };
        const originNode = (
          <UploadListItem
            actions={actions}
            actionsClassName={resolvedClassNames.actions}
            actionsStyle={resolvedStyles.actions}
            className={resolvedClassNames.item}
            file={file}
            iconRender={iconRender}
            isImageUrl={isImageUrl}
            listConfig={listConfig}
            listType={listType}
            previewFile={previewFile}
            progressClassName={resolvedClassNames.progress}
            progressStyle={resolvedStyles.progress}
            style={resolvedStyles.item}
            key={file.uid}
          />
        );
        return itemRender ? (
          <li key={file.uid}>{itemRender(originNode, file, fileList, actions)}</li>
        ) : (
          <li key={file.uid}>{originNode}</li>
        );
      })
    : null;

  return (
    // biome-ignore lint/a11y/useSemanticElements: A fieldset would impose form semantics on a file-transfer control.
    <div
      {...rootProps}
      className={classes(
        "launch-ui-upload",
        `is-${type}`,
        `is-list-${listType}`,
        disabled && "is-disabled",
        dragging && "is-dragging",
        resolvedClassNames.root,
        className,
      )}
      onDragEnter={
        type === "drag"
          ? (event) => {
              event.preventDefault();
              setDragging(true);
            }
          : undefined
      }
      onDragLeave={
        type === "drag"
          ? (event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
            }
          : undefined
      }
      onDragOver={type === "drag" ? (event) => event.preventDefault() : undefined}
      onDrop={type === "drag" ? handleDrop : undefined}
      onPaste={
        pastable
          ? (event) => {
              const files = Array.from(event.clipboardData.files);
              if (files.length) void processFiles(files);
            }
          : undefined
      }
      style={{ ...resolvedStyles.root, ...style }}
      tabIndex={pastable && !disabled ? 0 : undefined}
      role="group"
    >
      {input}
      {/* biome-ignore lint/a11y/useSemanticElements: The trigger may wrap a consumer-provided native button. */}
      <div
        aria-disabled={disabled || undefined}
        className={classes(
          "launch-ui-upload-trigger",
          resolvedClassNames.trigger,
          hideTrigger && "is-hidden",
        )}
        onClick={disabled || !openFileDialogOnClick ? undefined : () => inputRef.current?.click()}
        role="button"
        style={resolvedStyles.trigger}
        tabIndex={type === "drag" && !disabled ? 0 : undefined}
        onKeyDown={
          type === "drag" && !disabled
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }
            : undefined
        }
      >
        {triggerContent}
      </div>
      {showUploadList ? (
        <ul
          className={classes("launch-ui-upload-list", resolvedClassNames.list)}
          style={resolvedStyles.list}
        >
          {renderedList}
        </ul>
      ) : null}
    </div>
  );
}

function UploadDragger<TResponse = unknown>(props: Omit<UploadProps<TResponse>, "type">) {
  return <UploadComponent {...props} type="drag" />;
}

interface UploadComponentType {
  <TResponse = unknown>(props: UploadProps<TResponse>): ReactElement;
  readonly Dragger: typeof UploadDragger;
  readonly LIST_IGNORE: typeof UPLOAD_LIST_IGNORE;
}

export const Upload = Object.assign(UploadComponent, {
  Dragger: UploadDragger,
  LIST_IGNORE: UPLOAD_LIST_IGNORE,
}) as UploadComponentType;
