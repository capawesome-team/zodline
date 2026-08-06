# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`zodline` is a type-safe CLI parser built on Zod. Users declare commands, options, and positional args as Zod schemas; the library parses `process.argv`, validates against those schemas, and returns a fully-typed result. Zod is a peer dependency (v4); the library itself ships zero runtime dependencies.

## Commands

- **Build**: `npm run build` (tsc → `dist/`)
- **Watch build**: `npm run dev`
- **Test**: `npm test` (or `npm run test:run`) — Vitest, run once
- **Single test file**: `npx vitest run src/index.test.ts`
- **Single test by name**: `npx vitest run -t "<test name substring>"`
- **Watch tests**: `npx vitest`
- **Coverage**: `npm run test:coverage`
- **Lint/format check**: `npm run lint` (Prettier `--check`); **format**: `npm run fmt`
- **Run the example CLI**: `npm run build && node example.js greet --name World`

There is no ESLint; "lint" is Prettier only. `test:ui` requires the built dist.

## Architecture

Three source files under `src/`, all re-exported from `src/index.ts`:

- **`config.ts`** — the public builder API: `defineOptions`, `defineCommand`, `defineConfig`. These are thin identity/type-inference helpers that carry Zod generics through so consumers get inferred `options`/`args` types.
- **`types.ts`** — shared interfaces (`OptionsDefinition`, `CommandDefinition`, `DefineConfig`, `ProcessResult`) and the `ZodlineError` class. `ProcessResult` uses conditional types to infer `options`/`args` from a command's schemas.
- **`index.ts`** — the runtime: `processConfig` plus all internal parsing/validation/help helpers.

### Key design decision: `processConfig` does not run actions

`processConfig(config, argv)` returns `{ command, options, args }` — it does **not** invoke `command.action`. The caller is responsible for calling `await result.command.action(result.options, result.args)` (see `example.js`). Keep this separation; parsing and execution are intentionally decoupled.

### `processConfig` control flow (`index.ts`)

1. `parseFlags` splits argv into flags and positional args (collected under the `_` key).
2. Resolve the command name from `_[0]`. With no command: handle `--version`/`--help` (these call `process.exit(0)`), else fall back to `config.defaultCommand`, else show help and throw `ZodlineError`.
3. Per-command `--help` calls `displayCommandHelp` and `process.exit(0)`.
4. `processCommandExecution` runs `validateOptions` (flags) and, if `command.args` is set, `command.args.parse(args)`.

Note that `processConfig` both throws (`ZodlineError`) **and** calls `process.exit(0)` on help/version paths — tests must account for both exit styles.

### Flag parsing rules (`parseFlags`)

- Long (`--flag`), short (`-f`), `--flag=value`, and `--flag value` forms.
- Short-flag clustering: `-abc` → three boolean flags `a`, `b`, `c`.
- A flag repeated multiple times collects its values into an array.
- A flag whose next arg starts with `-` (or is absent) becomes boolean `true`.

### Options resolution pipeline (`validateOptions`)

Order matters: **unknown-option check → alias resolution → kebab→camel conversion → array normalization → `schema.parse`**.

- **Unknown options throw.** Any flag not in the schema (as camelCase or kebab-case), not an alias, and not `help`/`version` raises a `ZodlineError`. This holds even when a command has no options schema.
- **kebab-case ↔ camelCase**: users may pass `--android-max` for a schema key `androidMax`; camelCase wins if both are present (`resolveKebabCase`).
- **Array normalization**: a single value for an array-typed field is wrapped in an array before validation (`normalizeArrayFields`).

### Zod introspection (fragile — handle with care)

`isZodArrayType`, `extractDefaultValue`, and default-value formatting inspect Zod internals (`_def`, `constructor.name`, `_def.typeName`) and unwrap `ZodOptional`/`ZodDefault` wrappers manually. They deliberately check `constructor.name === 'ZodArray'` etc. because `instanceof` can fail across differing Zod instances. This code is tightly coupled to Zod's internal shape and is the most likely thing to break on a Zod upgrade — verify against the installed Zod v4 when touching it.

### Help output

Help/usage strings are printed with raw ANSI escape codes (e.g. `\x1b[36m`). Padding math in `displayHelp`/`displayCommandHelp` computes visible length excluding color codes — keep that in mind when editing alignment.

## Conventions

- Pure ESM (`"type": "module"`). Internal imports use explicit `.js` extensions (e.g. `from './types.js'`), required for ESM resolution even though sources are `.ts`.
- `tsconfig.json` is strict, including `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and `noUnusedLocals/Parameters` — expect the compiler to reject unused bindings and implicit `undefined` access.
- Tests exercise `index.ts` end-to-end through `processConfig` rather than unit-testing internal helpers.
