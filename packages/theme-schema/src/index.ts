import Type from "typebox";
import { Value } from "typebox/value";

export const THEME_SCHEMA_VERSION = "1" as const;

const StrictObject = <const Properties extends Type.TProperties>(
  properties: Properties,
  options: Omit<Type.TObjectOptions, "additionalProperties"> = {},
) => Type.Object(properties, { ...options, additionalProperties: false });

const identifierPattern = "^[a-z0-9]+(?:[.-][a-z0-9]+)+$";
const semverPattern =
  "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$";
const colorPattern =
  "^(?:#[0-9A-Fa-f]{3}|#[0-9A-Fa-f]{4}|#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{8}|rgba?\\([0-9.% ,/]+\\))$";
const radiusPattern = "^(?:0|[0-9]{1,2}px)$";
const shadowPattern =
  "^(?:none|(?:-?[0-9]{1,3}px\\s+){2,4}(?:#[0-9A-Fa-f]{3}|#[0-9A-Fa-f]{4}|#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{8}|rgba?\\([0-9.% ,/]+\\)))$";

export const ThemeAppearanceSchema = Type.Union([
  Type.Literal("light"),
  Type.Literal("dark"),
  Type.Literal("high-contrast"),
]);
export type ThemeAppearance = Type.Static<typeof ThemeAppearanceSchema>;

export const ThemeColorTokensSchema = StrictObject({
  accent: Type.String({ pattern: colorPattern }),
  accentHover: Type.String({ pattern: colorPattern }),
  border: Type.String({ pattern: colorPattern }),
  borderStrong: Type.String({ pattern: colorPattern }),
  canvas: Type.String({ pattern: colorPattern }),
  danger: Type.String({ pattern: colorPattern }),
  focus: Type.String({ pattern: colorPattern }),
  onAccent: Type.String({ pattern: colorPattern }),
  success: Type.String({ pattern: colorPattern }),
  surface: Type.String({ pattern: colorPattern }),
  surfaceHover: Type.String({ pattern: colorPattern }),
  surfaceRaised: Type.String({ pattern: colorPattern }),
  textMuted: Type.String({ pattern: colorPattern }),
  textPrimary: Type.String({ pattern: colorPattern }),
  textSecondary: Type.String({ pattern: colorPattern }),
  warning: Type.String({ pattern: colorPattern }),
});
export type ThemeColorTokens = Type.Static<typeof ThemeColorTokensSchema>;

export const ThemeRadiusTokensSchema = StrictObject({
  large: Type.String({ pattern: radiusPattern }),
  medium: Type.String({ pattern: radiusPattern }),
  small: Type.String({ pattern: radiusPattern }),
});
export type ThemeRadiusTokens = Type.Static<typeof ThemeRadiusTokensSchema>;

export const ThemeShadowTokensSchema = StrictObject({
  dialog: Type.Optional(Type.String({ maxLength: 200, pattern: shadowPattern })),
  menu: Type.Optional(Type.String({ maxLength: 200, pattern: shadowPattern })),
  panel: Type.Optional(Type.String({ maxLength: 200, pattern: shadowPattern })),
});
export type ThemeShadowTokens = Type.Static<typeof ThemeShadowTokensSchema>;

export const ThemeTypographyTokensSchema = StrictObject({
  fontFamily: Type.Optional(Type.Union([Type.Literal("system"), Type.Literal("humanist")])),
  monoFontFamily: Type.Optional(Type.Literal("system-mono")),
});
export type ThemeTypographyTokens = Type.Static<typeof ThemeTypographyTokensSchema>;

export const ThemeDocumentSchema = StrictObject(
  {
    $schema: Type.Optional(Type.String({ maxLength: 200, minLength: 1 })),
    appearance: ThemeAppearanceSchema,
    author: Type.Optional(StrictObject({ name: Type.String({ maxLength: 120, minLength: 1 }) })),
    family: Type.Optional(Type.String({ maxLength: 120, pattern: identifierPattern })),
    id: Type.String({ maxLength: 120, pattern: identifierPattern }),
    name: Type.String({ maxLength: 120, minLength: 1, pattern: "\\S" }),
    schemaVersion: Type.Literal(THEME_SCHEMA_VERSION),
    tokens: StrictObject({
      color: ThemeColorTokensSchema,
      radius: ThemeRadiusTokensSchema,
      shadow: Type.Optional(ThemeShadowTokensSchema),
      typography: Type.Optional(ThemeTypographyTokensSchema),
    }),
    version: Type.String({ maxLength: 64, pattern: semverPattern }),
  },
  { $id: "LaunchppThemeDocumentV1", title: "Launch++ theme document v1" },
);
export type ThemeDocument = Type.Static<typeof ThemeDocumentSchema>;

export interface ThemeValidationIssue {
  readonly keyword: string;
  readonly message: string;
  readonly path: string;
}

export type ThemeValidationResult =
  | { readonly ok: true; readonly value: ThemeDocument }
  | { readonly issues: readonly ThemeValidationIssue[]; readonly ok: false };

export function validateThemeDocument(value: unknown): ThemeValidationResult {
  const issues = Value.Errors(ThemeDocumentSchema, value).map((error) => ({
    keyword: error.keyword,
    message: error.message,
    path: error.instancePath || "/",
  }));
  return issues.length === 0 ? { ok: true, value: value as ThemeDocument } : { issues, ok: false };
}
