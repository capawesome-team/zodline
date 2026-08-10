# zodline

[![npm version](https://img.shields.io/npm/v/zodline)](https://www.npmjs.com/package/zodline)
[![npm downloads](https://img.shields.io/npm/dm/zodline)](https://www.npmjs.com/package/zodline)
[![license](https://img.shields.io/npm/l/zodline)](https://github.com/capawesome-team/zodline/blob/main/LICENSE)

Build type-safe command-line interfaces with Zod. Declare your commands, options and arguments as schemas — validation, TypeScript types and help output come for free.

📚 **[Documentation](https://zodline.dev/docs)** · [Quickstart](https://zodline.dev/docs/quickstart) · [API reference](https://zodline.dev/docs/reference/api)

## Features

- 🛡️ **Type-safe**: `options` and `args` are inferred from your schemas. Rename a field and every call site fails to compile.
- 📋 **Declarative**: A command is a plain object — description, schemas, action. No builder chains.
- ✅ **Validation included**: Coercion, defaults, refinements, unions — anything Zod can express, your CLI can accept.
- 🚫 **Strict by default**: Unknown flags are errors, not silently ignored keys. Typos surface immediately.
- ❓ **Generated help**: `--help` and `--version` are handled for you, including per-command help.
- 🚀 **Zero dependencies**: Only Zod, which you already have.

## Requirements

- Node.js 16 or later
- Zod 4 (peer dependency)
- An ESM project — `zodline` ships no CommonJS build

## Installation

```bash
npm install zodline zod
```

## Quickstart

```ts
import { z } from 'zod';
import { defineCommand, defineConfig, defineOptions, processConfig } from 'zodline';

const greet = defineCommand({
  description: 'Greet someone',
  options: defineOptions(
    z.object({
      name: z.string().describe('Name to greet'),
      loud: z.boolean().default(false).describe('Use uppercase'),
    }),
    { n: 'name', l: 'loud' }, // Short aliases
  ),
  action: async (options) => {
    // options is typed as { name: string; loud: boolean }
    const greeting = `Hello, ${options.name}!`;
    console.log(options.loud ? greeting.toUpperCase() : greeting);
  },
});

const config = defineConfig({
  meta: {
    name: 'my-cli',
    version: '1.0.0',
    description: 'A simple CLI example',
  },
  commands: { greet },
});

const result = processConfig(config, process.argv.slice(2));
await result.command.action(result.options, result.args);
```

Run it:

```bash
$ my-cli greet --name Alice
Hello, Alice!

$ my-cli greet -n Bob --loud
HELLO, BOB!
```

Help is generated from the same schemas:

```
$ my-cli --help

A simple CLI example (my-cli v1.0.0)

USAGE my-cli greet

COMMANDS

  greet    Greet someone

Use my-cli <command> --help for more information about a command.
```

```
$ my-cli greet --help

Greet someone (my-cli greet v1.0.0)

USAGE my-cli greet [OPTIONS]

OPTIONS

  --name, -n    Name to greet
  --loud, -l    Use uppercase (default: false)
```

## Usage

### Commands

Commands are a flat record of name to definition. Group related commands with a separator in the name:

```ts
const config = defineConfig({
  meta: { name: 'my-app', version: '1.0.0' },
  commands: {
    start: startCommand,
    'apps:list': appsListCommand,
    'apps:create': appsCreateCommand,
  },
});
```

Set `defaultCommand` to run a command when none is given:

```ts
const config = defineConfig({
  meta: { name: 'my-app', version: '1.0.0' },
  commands: { start: startCommand, build: buildCommand },
  defaultCommand: startCommand,
});
```

- `my-app` runs `startCommand`
- `my-app build` runs `buildCommand`
- `my-app --help` still shows the help message

### Options

`defineOptions` takes a Zod object schema and an optional map from short alias to schema key. The `.describe()` text becomes the option's help line, and `.default()` is shown in help.

```ts
const options = defineOptions(
  z.object({
    port: z.coerce.number().min(1).max(65535).default(3000).describe('Port to listen on'),
    files: z.array(z.string()).describe('Input files'),
    tags: z.array(z.string()).optional().describe('Tags to apply'),
  }),
  { p: 'port', f: 'files' },
);
```

Everything from the command line arrives as a string, so use `z.coerce` for numbers and other non-string types.

A single value for an array field is wrapped automatically, so both of these produce `['a.txt']`:

```bash
--files a.txt
--files a.txt --files b.txt   # ['a.txt', 'b.txt']
```

### Arguments

Positional arguments are validated by a single schema that receives the whole array. Use `z.tuple` for a fixed shape and `z.array` for a variable number:

```ts
const copy = defineCommand({
  description: 'Copy a file',
  args: z.tuple([z.string().describe('Source file'), z.string().describe('Destination file')]),
  options: defineOptions(z.object({ verbose: z.boolean().default(false) }), { v: 'verbose' }),
  action: async (options, args) => {
    const [source, destination] = args; // [string, string]
    console.log(`Copying ${source} to ${destination}`);
  },
});
```

### Flag syntax

| Form | Example | Result |
| --- | --- | --- |
| Long flag | `--verbose` | `verbose: true` |
| Long flag with value | `--port 3000`, `--port=3000` | `port: '3000'` |
| Short flag | `-v`, `-p 3000` | resolved through the alias map |
| Clustered short flags | `-abc` | `a: true, b: true, c: true` |
| Kebab-case | `--max-retries` | matches the schema key `maxRetries` |
| Repeated flag | `--file a.txt --file b.txt` | `file: ['a.txt', 'b.txt']` |

A flag whose next argument starts with `-`, or which is last, becomes `true`.

### Help and version

- `<cli> --help` prints the command list, `<cli> <command> --help` prints that command's options.
- `<cli> --version` prints `meta.version`. It is only handled when no command is given and `meta.version` is set.

Both paths print to stdout and call `process.exit(0)`. Keep that in mind when calling `processConfig` from tests.

### Error handling

`processConfig` validates and returns — it never invokes your action. That keeps parsing and execution separate, so commands stay testable.

```ts
import { z } from 'zod';
import { processConfig, ZodlineError } from 'zodline';

try {
  const result = processConfig(config, process.argv.slice(2));
  await result.command.action(result.options, result.args);
} catch (error) {
  if (error instanceof ZodlineError) {
    // Unknown command, unknown option, or no command specified
    console.error(error.message);
  } else if (error instanceof z.ZodError) {
    // An option failed schema validation
    console.error(z.prettifyError(error));
  } else {
    throw error;
  }
  process.exit(1);
}
```

Positional argument failures are currently thrown as a plain `Error` prefixed with `Argument validation failed:`.

## API

| Export | Description |
| --- | --- |
| `defineOptions(schema, aliases?)` | Pairs a Zod object schema with an optional short-alias map. |
| `defineCommand(definition)` | Defines a command from a `description`, `options`, `args` and `action`. |
| `defineConfig(config)` | Defines the CLI from `meta`, `commands` and an optional `defaultCommand`. |
| `processConfig(config, argv)` | Parses and validates `argv`, returning `{ command, options, args }`. |
| `ZodlineError` | Thrown for unknown commands and unknown options. |

See the [API reference](https://zodline.dev/docs/reference/api) for full signatures and types.

## Comparison

|  | zodline | commander | yargs |
| --- | --- | --- | --- |
| Validation | Zod schemas | custom parser functions | built-in coercions |
| Option types | inferred from the schema | manual type annotations | inferred from the builder chain |
| Runtime dependencies | 0 | 0 | 6 |
| Module format | ESM only | CJS and ESM | CJS and ESM |
| Parsing and execution | separate | coupled | coupled |

Dependency counts as of commander 15 and yargs 18. Both cover more surface than `zodline` — nested subcommands, shell completion, i18n. `zodline` is deliberately smaller and leans on Zod for everything it can.

## Used By

- [Capawesome Team CLI](https://github.com/capawesome-team/cli) — the Capawesome Cloud CLI to manage Live Updates and more.

## Contributing

```bash
npm install
npm test
npm run build
npm run lint
```

Bug reports and feature requests are welcome in the [issue tracker](https://github.com/capawesome-team/zodline/issues).

## Migration

`zodline` was previously published as `@robingenz/zli`. To migrate:

1. Replace the dependency:

   ```bash
   npm uninstall @robingenz/zli
   npm install zodline
   ```

2. Update import specifiers:

   ```diff
   - import { ... } from '@robingenz/zli';
   + import { ... } from 'zodline';
   ```

3. Rename the `ZliError` export to `ZodlineError` (the public API is otherwise unchanged):

   ```diff
   - import { ZliError } from '@robingenz/zli';
   + import { ZodlineError } from 'zodline';
   ```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

See [LICENSE](./LICENSE).
