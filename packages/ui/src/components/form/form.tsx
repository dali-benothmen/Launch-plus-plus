import {
  Children,
  type CSSProperties,
  cloneElement,
  createContext,
  type FormEvent,
  type FormHTMLAttributes,
  type ForwardedRef,
  forwardRef,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  useContext,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
} from "react";
import { classes } from "../internal/classes.js";

export type FormLayout = "horizontal" | "inline" | "vertical";
export type FormValidateTrigger = "onBlur" | "onChange";
export type FormValidateStatus = "error" | "success" | "validating" | "warning";
export type FormRequiredMark = boolean | "optional";

type AnyFormValues = Record<string, unknown>;
type FormName<TValues extends object> = Extract<keyof TValues, string> | (string & {});

export interface FormRule<TValues extends object = AnyFormValues> {
  readonly len?: number;
  readonly max?: number;
  readonly message?: string;
  readonly min?: number;
  readonly pattern?: RegExp;
  readonly required?: boolean;
  readonly transform?: (value: unknown) => unknown;
  readonly type?: "email" | "number" | "url";
  readonly validator?: (
    value: unknown,
    values: Readonly<TValues>,
  ) => Promise<string | undefined> | string | undefined;
  readonly whitespace?: boolean;
}

export interface FormErrorField<TValues extends object = AnyFormValues> {
  readonly errors: string[];
  readonly name: FormName<TValues>;
}

export interface FormFinishFailedInfo<TValues extends object = AnyFormValues> {
  readonly errorFields: Array<FormErrorField<TValues>>;
  readonly values: TValues;
}

export interface FormInstance<TValues extends object = AnyFormValues> {
  getFieldValue(name: FormName<TValues>): unknown;
  getFieldsValue(): TValues;
  resetFields(names?: ReadonlyArray<FormName<TValues>>): void;
  setFieldValue(name: FormName<TValues>, value: unknown): void;
  setFieldsValue(values: Partial<TValues>): void;
  submit(): void;
  validateFields(names?: ReadonlyArray<FormName<TValues>>): Promise<TValues>;
}

export interface FormProps<TValues extends object = AnyFormValues>
  extends Omit<FormHTMLAttributes<HTMLFormElement>, "children" | "onSubmit"> {
  readonly children?: ReactNode;
  readonly disabled?: boolean;
  readonly form?: FormInstance<TValues>;
  readonly initialValues?: Partial<TValues>;
  readonly layout?: FormLayout;
  readonly onFinish?: (values: TValues) => void | Promise<void>;
  readonly onFinishFailed?: (info: FormFinishFailedInfo<TValues>) => void;
  readonly onValuesChange?: (changedValues: Partial<TValues>, values: TValues) => void;
  readonly requiredMark?: FormRequiredMark;
}

export interface FormItemProps<TValues extends object = AnyFormValues> {
  readonly children?: ReactNode | ((form: FormInstance<TValues>) => ReactNode);
  readonly className?: string;
  readonly colon?: boolean;
  readonly extra?: ReactNode;
  readonly getValueFromEvent?: (...args: unknown[]) => unknown;
  readonly help?: ReactNode;
  readonly hidden?: boolean;
  readonly htmlFor?: string;
  readonly label?: ReactNode;
  readonly name?: FormName<TValues>;
  readonly noStyle?: boolean;
  readonly normalize?: (value: unknown, previousValue: unknown, values: TValues) => unknown;
  readonly required?: boolean;
  readonly rules?: ReadonlyArray<FormRule<TValues>>;
  readonly style?: CSSProperties;
  readonly trigger?: string;
  readonly validateStatus?: FormValidateStatus;
  readonly validateTrigger?: FormValidateTrigger | ReadonlyArray<FormValidateTrigger>;
  readonly valuePropName?: string;
}

interface FieldConfig {
  readonly label?: ReactNode;
  readonly rules: ReadonlyArray<FormRule<object>>;
}

interface FormSnapshot {
  readonly errors: Readonly<Record<string, ReadonlyArray<string>>>;
  readonly values: Readonly<AnyFormValues>;
  readonly validating: Readonly<Record<string, boolean>>;
}

interface FormCallbacks {
  readonly onValuesChange?: (changedValues: AnyFormValues, values: AnyFormValues) => void;
}

interface FormControlProps extends Record<string, unknown> {
  disabled?: unknown;
  id?: unknown;
  onBlur?: unknown;
}

function isEmpty(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function valueLength(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" || Array.isArray(value)) return value.length;
  return undefined;
}

function defaultRuleMessage(name: string, rule: FormRule<object>) {
  if (rule.required) return `${name} is required`;
  if (rule.type === "email") return "Enter a valid email address";
  if (rule.type === "url") return "Enter a valid URL";
  if (rule.type === "number") return `${name} must be a number`;
  if (rule.len !== undefined) return `${name} must contain ${rule.len} characters`;
  if (rule.min !== undefined) return `${name} must contain at least ${rule.min} characters`;
  if (rule.max !== undefined) return `${name} must contain no more than ${rule.max} characters`;
  return `${name} is not valid`;
}

function isTypeValid(value: unknown, type: FormRule<object>["type"]) {
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (typeof value !== "string") return false;
  if (type === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (type === "url") {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

class FormStore {
  private callbacks: FormCallbacks = {};
  private fields = new Map<string, FieldConfig>();
  private initialValues: AnyFormValues = {};
  private initialized = false;
  private listeners = new Set<() => void>();
  private snapshot: FormSnapshot = { errors: {}, validating: {}, values: {} };
  private submitter: (() => void) | undefined;
  private validationRuns = new Map<string, number>();

  readonly getSnapshot = () => this.snapshot;

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly form: FormInstance<AnyFormValues> = {
    getFieldValue: (name) => this.snapshot.values[name],
    getFieldsValue: () => ({ ...this.snapshot.values }),
    resetFields: (names) => this.resetFields(names),
    setFieldValue: (name, value) => this.setFieldValue(name, value),
    setFieldsValue: (values) => this.setFieldsValue(values),
    submit: () => this.submitter?.(),
    validateFields: (names) => this.validateFields(names),
  };

  initialize(values: AnyFormValues) {
    if (this.initialized) return;
    this.initialized = true;
    this.initialValues = { ...values };
    this.snapshot = { ...this.snapshot, values: { ...values } };
  }

  setCallbacks(callbacks: FormCallbacks) {
    this.callbacks = callbacks;
  }

  setSubmitter(submitter: (() => void) | undefined) {
    this.submitter = submitter;
  }

  registerField(name: string, config: FieldConfig) {
    this.fields.set(name, config);
    return () => {
      this.fields.delete(name);
    };
  }

  setFieldValue(name: string, value: unknown) {
    this.validationRuns.set(name, (this.validationRuns.get(name) ?? 0) + 1);
    const values = { ...this.snapshot.values, [name]: value };
    const errors = { ...this.snapshot.errors };
    delete errors[name];
    this.snapshot = {
      ...this.snapshot,
      errors,
      values,
    };
    this.emit();
    this.callbacks.onValuesChange?.({ [name]: value }, { ...values });
  }

  setFieldsValue(changedValues: AnyFormValues) {
    const values = { ...this.snapshot.values, ...changedValues };
    const errors = { ...this.snapshot.errors };
    for (const name of Object.keys(changedValues)) {
      delete errors[name];
      this.validationRuns.set(name, (this.validationRuns.get(name) ?? 0) + 1);
    }
    this.snapshot = { ...this.snapshot, errors, values };
    this.emit();
    this.callbacks.onValuesChange?.({ ...changedValues }, { ...values });
  }

  resetFields(names?: ReadonlyArray<string>) {
    if (!names) {
      for (const name of this.fields.keys()) {
        this.validationRuns.set(name, (this.validationRuns.get(name) ?? 0) + 1);
      }
      this.snapshot = {
        errors: {},
        validating: {},
        values: { ...this.initialValues },
      };
      this.emit();
      return;
    }
    const values = { ...this.snapshot.values };
    const errors = { ...this.snapshot.errors };
    const validating = { ...this.snapshot.validating };
    for (const name of names) {
      if (Object.hasOwn(this.initialValues, name)) values[name] = this.initialValues[name];
      else delete values[name];
      delete errors[name];
      delete validating[name];
      this.validationRuns.set(name, (this.validationRuns.get(name) ?? 0) + 1);
    }
    this.snapshot = { errors, validating, values };
    this.emit();
  }

  async validateField(name: string) {
    const config = this.fields.get(name);
    if (!config) return [];
    const validationRun = (this.validationRuns.get(name) ?? 0) + 1;
    this.validationRuns.set(name, validationRun);
    this.snapshot = { ...this.snapshot, validating: { ...this.snapshot.validating, [name]: true } };
    this.emit();
    const errors: string[] = [];
    const originalValue = this.snapshot.values[name];
    const displayName = typeof config.label === "string" ? config.label : name;

    for (const rule of config.rules) {
      const value = rule.transform?.(originalValue) ?? originalValue;
      const message = rule.message ?? defaultRuleMessage(displayName, rule);
      if (rule.required && isEmpty(value)) {
        errors.push(message);
        continue;
      }
      if (isEmpty(value)) continue;
      if (rule.whitespace === true && typeof value === "string" && value.trim().length === 0)
        errors.push(message);
      if (rule.type && !isTypeValid(value, rule.type)) errors.push(message);
      const length = valueLength(value);
      if (rule.len !== undefined && length !== rule.len) errors.push(message);
      if (rule.min !== undefined && length !== undefined && length < rule.min) errors.push(message);
      if (rule.max !== undefined && length !== undefined && length > rule.max) errors.push(message);
      if (rule.pattern && typeof value === "string" && !rule.pattern.test(value))
        errors.push(message);
      if (rule.validator) {
        try {
          const result = await rule.validator(value, { ...this.snapshot.values });
          if (result) errors.push(result);
        } catch (error) {
          errors.push(error instanceof Error ? error.message : message);
        }
      }
    }

    if (this.validationRuns.get(name) !== validationRun) {
      return [...(this.snapshot.errors[name] ?? [])];
    }

    const nextErrors = { ...this.snapshot.errors };
    const nextValidating = { ...this.snapshot.validating };
    if (errors.length) nextErrors[name] = errors;
    else delete nextErrors[name];
    delete nextValidating[name];
    this.snapshot = { ...this.snapshot, errors: nextErrors, validating: nextValidating };
    this.emit();
    return errors;
  }

  async validateFields(names?: ReadonlyArray<string>) {
    const fieldNames = names ? [...names] : [...this.fields.keys()];
    const results = await Promise.all(
      fieldNames.map(async (name) => ({ errors: await this.validateField(name), name })),
    );
    const errorFields = results.filter((field) => field.errors.length > 0);
    const values = { ...this.snapshot.values };
    if (errorFields.length) throw { errorFields, values } satisfies FormFinishFailedInfo;
    return values;
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

const stores = new WeakMap<object, FormStore>();

function createFormInstance<TValues extends object>() {
  const store = new FormStore();
  const form = store.form as FormInstance<TValues>;
  stores.set(form, store);
  return form;
}

function getFormStore(form: FormInstance<object>) {
  const store = stores.get(form);
  if (!store) throw new Error("Form instances must be created with Form.useForm().");
  return store;
}

function useForm<TValues extends object = AnyFormValues>(
  providedForm?: FormInstance<TValues>,
): [FormInstance<TValues>] {
  const formRef = useRef<FormInstance<TValues> | null>(null);
  if (!formRef.current) formRef.current = providedForm ?? createFormInstance<TValues>();
  return [providedForm ?? formRef.current];
}

interface FormContextValue {
  readonly disabled: boolean;
  readonly form: FormInstance<AnyFormValues>;
  readonly layout: FormLayout;
  readonly requiredMark: FormRequiredMark;
  readonly store: FormStore;
}

const FormContext = createContext<FormContextValue | null>(null);

function setForwardedRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

function FormRoot<TValues extends object = AnyFormValues>(
  {
    children,
    className,
    disabled = false,
    form: providedForm,
    initialValues = {},
    layout = "horizontal",
    onFinish,
    onFinishFailed,
    onValuesChange,
    requiredMark = true,
    ...props
  }: FormProps<TValues>,
  forwardedRef: ForwardedRef<HTMLFormElement>,
) {
  const [form] = useForm(providedForm);
  const store = getFormStore(form as FormInstance<object>);
  const formElementRef = useRef<HTMLFormElement | null>(null);
  store.initialize(initialValues as AnyFormValues);
  store.setCallbacks(
    onValuesChange
      ? {
          onValuesChange: (changed, values) =>
            onValuesChange(changed as Partial<TValues>, values as TValues),
        }
      : {},
  );

  useEffect(() => {
    store.setSubmitter(() => formElementRef.current?.requestSubmit());
    return () => store.setSubmitter(undefined);
  }, [store]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let values: AnyFormValues;
    try {
      values = await store.validateFields();
    } catch (error) {
      onFinishFailed?.(error as FormFinishFailedInfo<TValues>);
      return;
    }
    await onFinish?.(values as TValues);
  };

  const setFormRef = (node: HTMLFormElement | null) => {
    formElementRef.current = node;
    setForwardedRef(forwardedRef, node);
  };

  return (
    <FormContext.Provider
      value={{ disabled, form: form as FormInstance<AnyFormValues>, layout, requiredMark, store }}
    >
      <form
        {...props}
        aria-disabled={disabled || undefined}
        className={classes("launch-ui-form", `is-${layout}`, disabled && "is-disabled", className)}
        noValidate
        onSubmit={handleSubmit}
        ref={setFormRef}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}

function eventValue(args: unknown[], valuePropName: string) {
  const first = args[0];
  if (first && typeof first === "object" && "target" in first) {
    const target = (first as { target?: Record<string, unknown> }).target;
    if (target && valuePropName in target) return target[valuePropName];
  }
  return first;
}

function includesTrigger(
  configured: FormItemProps["validateTrigger"],
  trigger: FormValidateTrigger,
) {
  if (!configured) return trigger === "onChange";
  return Array.isArray(configured) ? configured.includes(trigger) : configured === trigger;
}

function FormItem<TValues extends object = AnyFormValues>(itemProps: FormItemProps<TValues>) {
  const {
    children,
    className,
    colon,
    extra,
    getValueFromEvent,
    help,
    hidden = false,
    htmlFor,
    label,
    name,
    noStyle = false,
    normalize,
    required,
    rules = [],
    style,
    trigger = "onChange",
    validateStatus,
    validateTrigger,
    valuePropName = "value",
  } = itemProps;
  const context = useContext(FormContext);
  if (!context) throw new Error("Form.Item must be used within Form.");
  const { disabled, form, requiredMark, store } = context;
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const generatedId = useId();
  const fieldName = name === undefined ? undefined : String(name);
  const controlId = htmlFor ?? (fieldName ? `launch-form-${generatedId}-${fieldName}` : undefined);
  const errorId = `${controlId ?? generatedId}-help`;
  const fieldErrors = fieldName ? snapshot.errors[fieldName] : undefined;
  const isValidating = fieldName ? snapshot.validating[fieldName] : false;
  const isRequired = required ?? rules.some((rule) => rule.required);
  const status =
    validateStatus ?? (isValidating ? "validating" : fieldErrors?.length ? "error" : undefined);
  const message = help ?? fieldErrors?.[0];

  useEffect(() => {
    if (!fieldName) return;
    return store.registerField(fieldName, {
      ...(label === undefined ? {} : { label }),
      rules: rules as ReadonlyArray<FormRule<object>>,
    });
  }, [fieldName, label, rules, store]);

  let control: ReactNode =
    typeof children === "function" ? children(form as FormInstance<TValues>) : children;
  const childArray = Children.toArray(control);
  if (childArray.length === 1 && isValidElement(childArray[0])) {
    const child = childArray[0] as ReactElement<FormControlProps>;
    const childProps = child.props;
    const injected: FormControlProps = {
      "aria-describedby": message !== undefined || extra !== undefined ? errorId : undefined,
      "aria-invalid": status === "error" || undefined,
      disabled: childProps.disabled ?? disabled,
      id: childProps.id ?? controlId,
    };
    if (fieldName) {
      const previousValue = snapshot.values[fieldName];
      injected[valuePropName] = previousValue ?? (valuePropName === "checked" ? false : "");
      const originalTrigger = childProps[trigger];
      injected[trigger] = (...args: unknown[]) => {
        const rawValue = getValueFromEvent
          ? getValueFromEvent(...args)
          : eventValue(args, valuePropName);
        const nextValue = normalize
          ? normalize(rawValue, previousValue, form.getFieldsValue() as TValues)
          : rawValue;
        store.setFieldValue(fieldName, nextValue);
        if (includesTrigger(validateTrigger, "onChange")) void store.validateField(fieldName);
        if (typeof originalTrigger === "function") originalTrigger(...args);
      };
      const originalBlur = childProps.onBlur;
      injected.onBlur = (...args: unknown[]) => {
        if (includesTrigger(validateTrigger, "onBlur")) void store.validateField(fieldName);
        if (typeof originalBlur === "function") originalBlur(...args);
      };
    }
    control = cloneElement(child, injected);
  }

  if (noStyle) return control;

  return (
    <div
      className={classes(
        "launch-ui-form-item",
        label === undefined || label === null ? "has-no-label" : undefined,
        status && `is-${status}`,
        hidden && "is-hidden",
        className,
      )}
      hidden={hidden}
      style={style}
    >
      {label !== undefined && label !== null ? (
        <label className="launch-ui-form-label" htmlFor={controlId}>
          {isRequired && requiredMark === true ? (
            <span aria-hidden="true" className="launch-ui-form-required-mark">
              *
            </span>
          ) : null}
          <span>{label}</span>
          {!isRequired && requiredMark === "optional" ? (
            <span className="launch-ui-form-optional-mark">(optional)</span>
          ) : null}
          {(colon ?? context.layout === "horizontal") ? (
            <span aria-hidden="true" className="launch-ui-form-colon">
              :
            </span>
          ) : null}
        </label>
      ) : null}
      <div className="launch-ui-form-control">
        <div className="launch-ui-form-control-input">{control}</div>
        {message !== undefined ? (
          <div
            className="launch-ui-form-help"
            id={errorId}
            role={status === "error" ? "alert" : undefined}
          >
            {message}
          </div>
        ) : null}
        {extra !== undefined ? (
          <div className="launch-ui-form-extra" id={message === undefined ? errorId : undefined}>
            {extra}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type FormRootComponent = <TValues extends object = AnyFormValues>(
  props: FormProps<TValues> & RefAttributes<HTMLFormElement>,
) => ReactElement | null;

interface FormComponent extends FormRootComponent {
  readonly Item: typeof FormItem;
  readonly useForm: typeof useForm;
}

const ForwardForm = forwardRef(FormRoot) as FormRootComponent;

export const Form = Object.assign(ForwardForm, { Item: FormItem, useForm }) as FormComponent;
