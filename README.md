# @robingenz/zli

[![npm version](https://img.shields.io/npm/v/@robingenz/zli)](https://www.npmjs.com/package/@robingenz/zli)
[![npm downloads](https://img.shields.io/npm/dm/@robingenz/zli)](https://www.npmjs.com/package/@robingenz/zli)
[![license](https://img.shields.io/npm/l/@robingenz/zli)](https://github.com/robingenz/zli/blob/main/LICENSE)

A powerful CLI parser built with TypeScript and Zod for type-safe command-line interfaces.

## Features

- 🛡️ **Type-safe**: Built with TypeScript and Zod for runtime validation.
- 📋 **Declarative**: Define commands, options, and arguments with simple schemas.
- 🔄 **Flexible parsing**: Support for long flags, short flags, and flag clustering.
- 🔀 **Smart conversion**: Automatic kebab-case to camelCase conversion.
- 🏷️ **Alias support**: Define short aliases for any option.
- 📦 **Array handling**: Automatic normalization of single values to arrays.
- 🎯 **Default commands**: Set a default command to run when no command is specified.
- ❓ **Help message**: Automatic help generation for commands and options.
- ⚠️ **Error handling**: Clear, actionable error messages.
- 🚀 **Zero dependencies**: Only requires Zod as a peer dependency.
- 📦 **ESM support**: Modern ES modules with full TypeScript support.

## Installation

```bash
npm install @robingenz/zli zod
```

## Usage

### Basic Example

```javascript
import { z } from 'zod';
import { defineConfig, defineCommand, defineOptions, processConfig } from '@robingenz/zli';

// Define a simple command
const greetCommand = defineCommand({
  description: 'Greet someone',
  options: defineOptions(
    z.object({
      name: z.string().describe('Name to greet'),
      loud: z.boolean().default(false).describe('Use uppercase'),
    }),
    { n: 'name', l: 'loud' } // Short aliases
  ),
  action: async (options) => {
    const greeting = `Hello, ${options.name}!`;
    console.log(options.loud ? greeting.toUpperCase() : greeting);
  },
});

// Configure the CLI
const config = defineConfig({
  meta: {
    name: 'my-cli',
    version: '1.0.0',
    description: 'A simple CLI example',
  },
  commands: {
    greet: greetCommand,
  },
  defaultCommand: greetCommand,
});

// Process command line arguments
try {
  const result = processConfig(config, process.argv.slice(2));
  await result.command.action(result.options, result.args);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
```

### Command Usage

```bash
# Show help
my-cli --help
my-cli greet --help

# Run commands
my-cli greet --name Alice
my-cli greet -n Bob --loud

# Run default command
my-cli --name Alice
my-cli greet --name Alice
```

### Advanced Features

#### Default Commands

You can specify a default command that will be executed when no command is provided:

```javascript
const config = defineConfig({
  meta: {
    name: 'my-app',
    version: '1.0.0',
  },
  commands: {
    start: startCommand,
    build: buildCommand,
  },
  defaultCommand: startCommand,
});
```

With this configuration:
- `my-app` will run the `startCommand`
- `my-app --help` will still show the help message
- `my-app build` will run the `build` command

#### Commands with Arguments

```javascript
const copyCommand = defineCommand({
  description: 'Copy a file',
  args: z.tuple([
    z.string().describe('Source file'),
    z.string().describe('Destination file'),
  ]),
  options: defineOptions(
    z.object({
      verbose: z.boolean().default(false).describe('Verbose output'),
    }),
    { v: 'verbose' }
  ),
  action: async (options, args) => {
    const [source, dest] = args;
    console.log(`Copying ${source} to ${dest}`);
  },
});
```

#### Array Options

```javascript
const options = defineOptions(
  z.object({
    files: z.array(z.string()).describe('Input files'),
    tags: z.array(z.string()).optional().describe('Tags to apply'),
  })
);

// Usage: --files file1.txt --files file2.txt
// Single values are automatically converted to arrays
```

#### Type Transformations

```javascript
const options = defineOptions(
  z.object({
    port: z.coerce.number().min(1).max(65535).describe('Port number'),
    count: z.coerce.number().min(1).describe('Count'),
  })
);
```

### Flag Parsing

`@robingenz/zli` supports various flag formats:

```bash
# Long flags
--verbose --name=value --port 3000

# Short flags  
-v -n value -p 3000

# Flag clustering
-abc  # equivalent to -a -b -c

# Kebab-case conversion
--my-option  # becomes myOption in your code

# Multiple values
--file a.txt --file b.txt  # becomes ['a.txt', 'b.txt']
```

### API Reference

#### `defineOptions(schema, aliases?)`

Define options for a command with optional aliases.

- `schema`: Zod object schema defining the options
- `aliases`: Optional object mapping short aliases to option names

#### `defineCommand(config)`

Define a command with options, arguments, and action.

- `description`: Command description for help
- `options`: Options definition (optional)
- `args`: Zod schema for arguments (optional)  
- `action`: Function to execute when command is run

#### `defineConfig(config)`

Define the CLI configuration.

- `meta`: CLI metadata (name, version, description)
- `commands`: Object mapping command names to definitions
- `defaultCommand`: Optional default command definition to run when no command is specified

#### `processConfig(config, args)`

Process command line arguments and return the result.

- `config`: CLI configuration
- `args`: Command line arguments (typically `process.argv.slice(2)`)

Returns an object with:
- `command`: The matched command definition
- `options`: Parsed and validated options
- `args`: Parsed and validated arguments

## Used By

- [Capawesome Team CLI](https://github.com/capawesome-team/cli) - The Capawesome Cloud CLI to manage Live Updates and more.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

See [LICENSE](./LICENSE).