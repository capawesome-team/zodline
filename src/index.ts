import { z } from 'zod';
import type { CommandDefinition, DefineConfig, OptionsDefinition, ProcessResult } from './types.js';
import { ZodlineError } from './types.js';

/**
 * Parses command line arguments into flags and non-flag arguments.
 * Handles both long flags (--flag) and short flags (-f), including flag clustering (-abc).
 * Supports flags with values (--flag=value or --flag value) and boolean flags.
 * When the same flag is specified multiple times, values are collected into an array.
 *
 * @param args - Array of command line arguments to parse
 * @returns Object containing parsed flags and non-flag arguments under '_' key
 *
 * @example
 * parseFlags(['--verbose', '--count', '5', 'file.txt'])
 * // Returns: { verbose: true, count: '5', _: ['file.txt'] }
 *
 * @example
 * parseFlags(['--custom-property', 'key1=value1', '--custom-property', 'key2=value2'])
 * // Returns: { 'custom-property': ['key1=value1', 'key2=value2'], _: [] }
 */
function parseFlags(args: string[]): Record<string, string | boolean | string[]> {
  const flags: Record<string, string | boolean | string[]> = {};
  const nonFlags: string[] = [];

  const addFlag = (key: string, value: string | boolean) => {
    if (key in flags) {
      const existing = flags[key];
      if (Array.isArray(existing)) {
        existing.push(value as string);
      } else {
        flags[key] = [existing as string, value as string];
      }
    } else {
      flags[key] = value;
    }
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (key.includes('=')) {
        const [flagName, ...valueParts] = key.split('=');
        if (flagName) {
          addFlag(flagName, valueParts.join('='));
        }
      } else {
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          addFlag(key, nextArg);
          i++;
        } else {
          addFlag(key, true);
        }
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      const key = arg.slice(1);
      if (key.length === 1) {
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          addFlag(key, nextArg);
          i++;
        } else {
          addFlag(key, true);
        }
      } else {
        for (const char of key) {
          addFlag(char, true);
        }
      }
    } else {
      nonFlags.push(arg);
    }
  }

  return { ...flags, _: nonFlags };
}

/**
 * Resolves flag aliases by replacing alias keys with their target keys.
 * If both alias and target exist, the alias value takes precedence.
 *
 * @param flags - Object containing parsed flags
 * @param aliases - Optional mapping of alias keys to target keys
 * @returns New flags object with aliases resolved to their target keys
 *
 * @example
 * resolveAliases({ v: true, verbose: false }, { v: 'verbose' })
 * // Returns: { verbose: true }
 */
function resolveAliases(flags: Record<string, any>, aliases?: Record<string, string>): Record<string, any> {
  if (!aliases) return flags;

  const resolved = { ...flags };
  for (const [alias, target] of Object.entries(aliases)) {
    if (alias in resolved) {
      resolved[target] = resolved[alias];
      delete resolved[alias];
    }
  }
  return resolved;
}

/**
 * Converts a camelCase string to kebab-case.
 *
 * @param str - The camelCase string to convert
 * @returns The kebab-case version of the input string
 *
 * @example
 * camelToKebab('androidMax') // Returns: 'android-max'
 * camelToKebab('expiresInDays') // Returns: 'expires-in-days'
 */
function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Resolves kebab-case flags to their camelCase equivalents based on the schema.
 * Only converts kebab-case flags when the camelCase version is not already present.
 * This allows users to pass --android-max instead of --androidMax.
 *
 * @param flags - Object containing parsed flags
 * @param schema - Zod schema object defining the expected camelCase keys
 * @returns New flags object with kebab-case flags converted to camelCase
 *
 * @example
 * resolveKebabCase({ 'android-max': '10' }, schema)
 * // Returns: { androidMax: '10' } (if androidMax is in schema)
 */
function resolveKebabCase(flags: Record<string, any>, schema: z.ZodObject<any>): Record<string, any> {
  const resolved = { ...flags };
  const schemaKeys = Object.keys(schema.shape);

  for (const camelKey of schemaKeys) {
    if (!(camelKey in resolved)) {
      const kebabKey = camelToKebab(camelKey);
      if (kebabKey in resolved) {
        resolved[camelKey] = resolved[kebabKey];
        delete resolved[kebabKey];
      }
    }
  }

  return resolved;
}

/**
 * Builds and displays a header line with description and meta information.
 *
 * @param options - Header display options
 */
function displayHeader(options: {
  commandName?: string | undefined;
  description?: string | undefined;
  packageName?: string | undefined;
  version?: string | undefined;
}): void {
  const parts = [];
  if (options.description) parts.push(options.description);

  const metaParts = [];
  if (options.packageName) metaParts.push(options.packageName);
  if (options.commandName) metaParts.push(options.commandName);
  if (options.version) metaParts.push(`v${options.version}`);

  if (metaParts.length > 0) {
    parts.push(`(${metaParts.join(' ')})`);
  }

  if (parts.length > 0) {
    console.log(`\x1b[90m${parts.join(' ')}\x1b[0m\n`);
  }
}

/**
 * Displays the main help screen with all available commands.
 * Shows CLI version, usage instructions, and a formatted list of commands with descriptions.
 *
 * @param commands - Object mapping command names to their definitions
 * @param meta - Meta information about the CLI
 */
function displayHelp<T extends Record<string, CommandDefinition<any, any>>>(
  commands: T,
  meta?: { name?: string; version?: string; description?: string },
): void {
  displayHeader({
    description: meta?.description,
    packageName: meta?.name,
    version: meta?.version,
  });

  const usageName = meta?.name || 'cli';
  console.log(`\x1b[1mUSAGE\x1b[0m \x1b[36m${usageName} <command>\x1b[0m\n`);

  console.log('\x1b[1mCOMMANDS\x1b[0m\n');

  // Find the maximum command name length for alignment
  const maxLength = Math.max(...Object.keys(commands).map((name) => name.length));

  for (const [name, command] of Object.entries(commands)) {
    const description = command.description || '';
    const padding = ' '.repeat(Math.max(2, maxLength - name.length + 4));
    console.log(`  \x1b[36m${name}\x1b[0m${padding}${description}`);
  }

  if (meta?.name) {
    console.log(`\nUse \x1b[36m${meta.name} <command> --help\x1b[0m for more information about a command.`);
  }
}

/**
 * Displays help information for a specific command.
 * Shows command description, usage, and available options with their descriptions.
 *
 * @param commandName - Name of the command to show help for
 * @param command - Command definition containing options and description
 * @param meta - Meta information about the CLI
 */
function displayCommandHelp(
  commandName: string,
  command: CommandDefinition<any, any>,
  meta?: { name?: string; version?: string; description?: string },
): void {
  displayHeader({
    commandName,
    description: command.description,
    packageName: meta?.name,
    version: meta?.version,
  });

  // Build usage line
  const usageName = meta?.name || 'cli';
  let usageLine = `\x1b[1mUSAGE\x1b[0m \x1b[36m${usageName} ${commandName}`;

  // Add [OPTIONS] if the command has options
  if (command.options) {
    usageLine += ' [OPTIONS]';
  }

  // Add args placeholder if the command expects args
  if (command.args) {
    usageLine += ' [ARGS]';
  }

  console.log(`${usageLine}\x1b[0m\n`);

  // Display options if they exist
  if (command.options?.schema) {
    console.log('\x1b[1mOPTIONS\x1b[0m\n');

    const shape = command.options.schema.shape;
    const aliases = command.options.aliases || {};

    // Calculate the maximum length for consistent padding
    let maxLength = 0;
    for (const [key] of Object.entries(shape)) {
      const alias = Object.keys(aliases).find((alias) => aliases[alias] === key);
      const kebabKey = camelToKebab(key);
      const visibleLength = `  --${kebabKey}${alias ? `, -${alias}` : ''}`.length;
      maxLength = Math.max(maxLength, visibleLength);
    }

    for (const [key, zodType] of Object.entries(shape)) {
      const description = (zodType as any).description || '';
      const alias = Object.keys(aliases).find((alias) => aliases[alias] === key);
      const kebabKey = camelToKebab(key);

      let optionLine = `  \x1b[36m--${kebabKey}\x1b[0m`;
      if (alias) {
        optionLine += `, \x1b[36m-${alias}\x1b[0m`;
      }

      // Extract default value if present
      const defaultValue = extractDefaultValue(zodType);
      let finalDescription = description;
      if (defaultValue !== undefined) {
        finalDescription = description + (description ? ' ' : '') + `(default: ${defaultValue})`;
      }

      // Add padding and description (accounting for color codes)
      const visibleLength = `  --${kebabKey}${alias ? `, -${alias}` : ''}`.length;
      const padding = ' '.repeat(Math.max(2, maxLength - visibleLength + 4));
      console.log(`${optionLine}${padding}${finalDescription}`);
    }
  }
}

/**
 * Normalizes single values to arrays for fields that are defined as arrays in the schema.
 * This ensures that when a user provides a single value for an array field,
 * it gets wrapped in an array before validation.
 *
 * @param options - Object containing parsed options
 * @param schema - Zod schema object defining the expected field types
 * @returns New options object with single values normalized to arrays where needed
 *
 * @example
 * normalizeArrayFields({ customProperty: 'key=value' }, schema)
 * // Returns: { customProperty: ['key=value'] } (if customProperty is defined as array in schema)
 */
function normalizeArrayFields(options: Record<string, any>, schema: z.ZodObject<any>): Record<string, any> {
  const normalized = { ...options };
  const shape = schema.shape;

  for (const [key, zodType] of Object.entries(shape)) {
    if (key in normalized) {
      // Check if this field is defined as an array (including optional arrays)
      const isArrayField = isZodArrayType(zodType);

      if (isArrayField && !Array.isArray(normalized[key])) {
        // Convert single value to array
        normalized[key] = [normalized[key]];
      }
    }
  }

  return normalized;
}

/**
 * Checks if a Zod type is an array type, handling optional and default wrappers.
 *
 * @param zodType - The Zod type to check
 * @returns True if the type is an array type
 */
function isZodArrayType(zodType: any): boolean {
  // Handle ZodOptional and ZodDefault wrappers, but stop when we find the actual type
  let innerType = zodType;

  // Only unwrap wrapper types like ZodOptional and ZodDefault, not the content types
  while (innerType._def && (innerType._def.innerType || innerType._def.type)) {
    const next = innerType._def.innerType || innerType._def.type;

    // Stop unwrapping if we reach a content type (like ZodArray, ZodString, etc.)
    if (innerType.constructor.name === 'ZodOptional' || innerType.constructor.name === 'ZodDefault') {
      innerType = next;
    } else {
      break;
    }
  }

  // Check for ZodArray type name as instanceof might not work with different zod instances
  return innerType instanceof z.ZodArray || (innerType._def && innerType._def.typeName === 'ZodArray');
}

/**
 * Creates an error for unknown options with proper flag prefix and display name.
 *
 * @param optionName - The unknown option name
 * @returns ZodlineError with formatted error message
 */
function createUnknownOptionError(optionName: string): ZodlineError {
  const flagPrefix = optionName.length === 1 ? '-' : '--';
  const displayName = optionName.length === 1 ? optionName : camelToKebab(optionName);
  return new ZodlineError(`Unknown option: \x1b[36m${flagPrefix}${displayName}\x1b[0m`);
}

/**
 * Extracts the default value from a Zod type, handling nested optional and default wrappers.
 *
 * @param zodType - The Zod type to extract default value from
 * @returns The formatted default value if present, undefined otherwise
 */
function extractDefaultValue(zodType: any): string | undefined {
  // Traverse through the type definition to find default value
  let currentType = zodType;

  while (currentType && currentType._def) {
    // Check if this is a ZodDefault type
    if (currentType.constructor.name === 'ZodDefault' || currentType._def.typeName === 'ZodDefault') {
      // Handle both function and direct value defaults
      const defaultValue = currentType._def.defaultValue;
      const value = typeof defaultValue === 'function' ? defaultValue() : defaultValue;

      // Format the value based on its type
      if (typeof value === 'string') {
        return `"${value}"`;
      }

      return String(value);
    }

    // Move to the inner type if it exists
    if (currentType._def.innerType) {
      currentType = currentType._def.innerType;
    } else if (currentType._def.type) {
      currentType = currentType._def.type;
    } else {
      break;
    }
  }

  return undefined;
}

/**
 * Validates and transforms command options using Zod schema validation.
 * Processes aliases and kebab-case conversion before validation.
 * Ensures that single values for array fields are converted to arrays.
 * Throws an error if any unknown options are provided.
 *
 * @param flags - Raw parsed flags from command line
 * @param optionsDef - Optional options definition with schema and aliases
 * @returns Validated options object matching the schema
 * @throws Error if validation fails or unknown options are provided
 *
 * @example
 * validateOptions({ 'android-max': '10' }, { schema: z.object({ androidMax: z.string() }) })
 * // Returns: { androidMax: '10' }
 *
 * @example
 * validateOptions({ 'custom-property': 'key=value' }, { schema: z.object({ customProperty: z.array(z.string()) }) })
 * // Returns: { customProperty: ['key=value'] }
 */
function validateOptions<T extends z.ZodObject<any> = z.ZodObject<any>>(
  flags: Record<string, any>,
  optionsDef?: OptionsDefinition<T>,
): any {
  if (!optionsDef) {
    // Check for unknown options when no schema is defined
    const { _, ...options } = flags;
    const unknownOptions = Object.keys(options);
    if (unknownOptions.length > 0) {
      // Find the first unknown option that looks like a flag
      const firstUnknown = unknownOptions.find((key) => key !== 'help' && key !== 'version');
      if (firstUnknown) {
        throw createUnknownOptionError(firstUnknown);
      }
    }
    return {};
  }

  // Get valid option names from schema
  const schemaKeys = Object.keys(optionsDef.schema.shape);
  const validNames = new Set<string>();

  // Add camelCase names
  schemaKeys.forEach((key) => validNames.add(key));

  // Add kebab-case versions
  schemaKeys.forEach((key) => validNames.add(camelToKebab(key)));

  // Add aliases
  if (optionsDef.aliases) {
    Object.keys(optionsDef.aliases).forEach((alias) => validNames.add(alias));
  }

  // Add standard help and version flags
  validNames.add('help');
  validNames.add('version');

  // Check for unknown options before processing
  const { _, ...options } = flags;
  for (const optionName of Object.keys(options)) {
    if (!validNames.has(optionName)) {
      throw createUnknownOptionError(optionName);
    }
  }

  const resolvedAliases = resolveAliases(flags, optionsDef.aliases);
  const resolvedKebab = resolveKebabCase(resolvedAliases, optionsDef.schema);
  const { _: resolvedUnderscore, ...resolvedOptions } = resolvedKebab;

  // Normalize single values to arrays for fields that expect arrays
  const normalizedOptions = normalizeArrayFields(resolvedOptions, optionsDef.schema);

  return optionsDef.schema.parse(normalizedOptions);
}

/**
 * Processes a command with its options and arguments.
 * Validates options using the command's schema and parses arguments if provided.
 *
 * @param command - The command definition to process
 * @param parsedFlags - Parsed flags from command line
 * @param args - Arguments to validate and process
 * @returns Processed result containing command, options, and arguments
 * @throws Error for validation failures
 */
function processCommandExecution<TCommand extends CommandDefinition<any, any>>(
  command: TCommand,
  parsedFlags: Record<string, any>,
  args: string[],
): ProcessResult<TCommand> {
  // Process command options
  const options = validateOptions(parsedFlags, command.options);

  // Validate args if schema is provided
  let validatedArgs: any = args;
  if (command.args) {
    try {
      validatedArgs = command.args.parse(args);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        throw new Error(`Argument validation failed: ${issues}`);
      }
      throw error;
    }
  }

  return {
    command,
    options,
    args: validatedArgs,
  } as ProcessResult<TCommand>;
}

/**
 * Finds the command name that matches the longest prefix of the given tokens.
 * This allows multi-word command names such as 'config set'.
 *
 * @param commandNames - Names of all available commands
 * @param tokens - Non-flag command line arguments
 * @returns The matching command name, or undefined if no command matches
 *
 * @example
 * findCommandName(['config', 'config set'], ['config', 'set', 'theme'])
 * // Returns: 'config set'
 */
function findCommandName(commandNames: string[], tokens: string[]): string | undefined {
  for (let wordCount = tokens.length; wordCount > 0; wordCount--) {
    const candidate = tokens.slice(0, wordCount).join(' ');
    if (commandNames.includes(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Returns the commands that belong to a group, i.e. whose name starts with the group name followed by a space.
 *
 * @param commands - Object mapping command names to their definitions
 * @param groupName - First word of the multi-word command names to look for
 * @returns Object containing only the commands of the group
 *
 * @example
 * findCommandsInGroup({ 'config set': ..., 'config get': ..., login: ... }, 'config')
 * // Returns: { 'config set': ..., 'config get': ... }
 */
function findCommandsInGroup(
  commands: Record<string, CommandDefinition<any, any>>,
  groupName: string,
): Record<string, CommandDefinition<any, any>> {
  return Object.fromEntries(Object.entries(commands).filter(([name]) => name.startsWith(`${groupName} `)));
}

/**
 * Main entry point for processing CLI configuration and arguments.
 * Parses command line arguments, validates options, and returns the processed result.
 * Handles help display, command validation, and option processing.
 *
 * @param config - CLI configuration with commands
 * @param args - Command line arguments (typically process.argv.slice(2))
 * @returns Processed result containing command, options, and arguments
 * @throws Error for invalid commands or validation failures
 *
 * @example
 * processConfig(config, ['apps:bundles:create', '--android-max', '10'])
 * // Returns: { command: ..., options: { androidMax: '10' }, args: [] }
 *
 * @example
 * processConfig(config, ['config', 'set', 'theme'])
 * // Matches the multi-word command 'config set' and returns: { command: ..., options: {}, args: ['theme'] }
 */
export function processConfig<TCommands extends Record<string, CommandDefinition<any, any>> = {}>(
  config: DefineConfig<TCommands>,
  args: string[],
): ProcessResult<CommandDefinition<any, any>> {
  const parsedFlags = parseFlags(args);
  const commandArgs = (parsedFlags._ as string[]) || [];

  const firstCommandArg = commandArgs[0];

  if (!firstCommandArg) {
    if (parsedFlags.version === true && config.meta?.version) {
      // Show version and exit successfully
      console.log(config.meta.version);
      process.exit(0);
    } else if (parsedFlags.help === true) {
      // Show help and exit successfully
      displayHelp(config.commands, config.meta);
      process.exit(0);
    } else if (config.defaultCommand) {
      // Use default command when no command is specified
      return processCommandExecution(config.defaultCommand, parsedFlags, commandArgs);
    } else {
      // Show help and throw error
      displayHelp(config.commands, config.meta);
      throw new ZodlineError('No command specified.');
    }
  }

  // Find the command
  const commandName = findCommandName(Object.keys(config.commands), commandArgs);
  const command = commandName && config.commands[commandName];
  if (!commandName || !command) {
    // Show only the commands of the group (e.g. `config` for `config set`) if there is one
    const groupCommands = findCommandsInGroup(config.commands, firstCommandArg);
    const isGroup = Object.keys(groupCommands).length > 0;
    displayHelp(isGroup ? groupCommands : config.commands, config.meta);
    if (isGroup && parsedFlags.help === true) {
      process.exit(0);
    }
    throw new ZodlineError(`Unknown command: \x1b[36m${commandArgs.join(' ')}\x1b[0m`);
  }

  const remainingArgs = commandArgs.slice(commandName.split(' ').length);

  // Check for help flag for the specific command
  if (parsedFlags.help === true) {
    displayCommandHelp(commandName, command, config.meta);
    process.exit(0);
  }

  // Process the command
  return processCommandExecution(command, parsedFlags, remainingArgs);
}

// Export main functions and types from config
export { defineOptions, defineCommand, defineConfig } from './config.js';
export { ZodlineError } from './types.js';
export type { OptionsDefinition, CommandDefinition, DefineConfig, ProcessResult } from './types.js';
