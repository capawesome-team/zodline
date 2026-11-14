import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { processConfig, defineConfig, defineCommand, defineOptions } from './index.js';
import { ZodlineError } from './types.js';

describe('index', () => {
  // Mock console methods
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  it('should parse boolean flags', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          options: defineOptions(
            z.object({
              verbose: z.boolean().default(false),
              debug: z.boolean().default(false),
            }),
          ),
          action: vi.fn(),
        }),
      },
    });

    const result = processConfig(config, ['test', '--verbose', '--debug']);
    expect(result.options).toEqual({ verbose: true, debug: true });
  });

  it('should parse flags with values', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          options: defineOptions(
            z.object({
              name: z.string(),
              count: z.string(),
            }),
          ),
          action: vi.fn(),
        }),
      },
    });

    const result = processConfig(config, ['test', '--name', 'test', '--count', '5']);
    expect(result.options).toEqual({ name: 'test', count: '5' });
  });

  it('should parse flags with equals syntax', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          options: defineOptions(
            z.object({
              name: z.string(),
              count: z.string(),
            }),
          ),
          action: vi.fn(),
        }),
      },
    });

    const result = processConfig(config, ['test', '--name=test', '--count=5']);
    expect(result.options).toEqual({ name: 'test', count: '5' });
  });

  it('should handle aliases', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          options: defineOptions(
            z.object({
              verbose: z.boolean().default(false),
              name: z.string(),
            }),
            { v: 'verbose', n: 'name' },
          ),
          action: vi.fn(),
        }),
      },
    });

    const result = processConfig(config, ['test', '-v', '-n', 'test']);
    expect(result.options).toEqual({ verbose: true, name: 'test' });
  });

  it('should handle array options with a single value', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          options: defineOptions(
            z.object({
              files: z.array(z.string()),
            }),
          ),
          action: vi.fn(),
        }),
      },
    });

    const result = processConfig(config, ['test', '--files', 'a.txt']);
    expect(result.options).toEqual({ files: ['a.txt'] });
  });

  it('should handle array options with multiple values', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          options: defineOptions(
            z.object({
              files: z.array(z.string()),
            }),
          ),
          action: vi.fn(),
        }),
      },
    });

    const result = processConfig(config, ['test', '--files', 'a.txt', '--files', 'b.txt']);
    expect(result.options).toEqual({ files: ['a.txt', 'b.txt'] });
  });

  it('should handle complex equals syntax', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          options: defineOptions(
            z.object({
              env: z.string(),
            }),
          ),
          action: vi.fn(),
        }),
      },
    });

    const result = processConfig(config, ['test', '--env=NODE_ENV=production']);
    expect(result.options).toEqual({ env: 'NODE_ENV=production' });
  });

  it('should process a simple command with options', () => {
    const config = defineConfig({
      meta: { name: 'test-cli', version: '1.0.0' },
      commands: {
        create: defineCommand({
          description: 'Create something',
          options: defineOptions(
            z.object({
              name: z.string(),
              verbose: z.boolean().default(false),
            }),
          ),
          action: vi.fn(),
        }),
      },
    });

    const result = processConfig(config, ['create', '--name', 'test']);

    expect(result.command.description).toBe('Create something');
    expect(result.options).toEqual({ name: 'test', verbose: false });
    expect(result.args).toEqual([]);
  });

  it('should handle kebab-case flags', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          options: defineOptions(
            z.object({
              androidMax: z.string(),
            }),
          ),
          action: vi.fn(),
        }),
      },
    });

    const result = processConfig(config, ['test', '--android-max', '10']);
    expect(result.options).toEqual({ androidMax: '10' });
  });

  it('should validate and parse arguments', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          args: z.tuple([z.string(), z.string().transform((s) => parseInt(s, 10) * 2)]),
          action: vi.fn(),
        }),
      },
    });

    const result = processConfig(config, ['test', 'hello', '5']);
    expect(result.args).toEqual(['hello', 10]);
  });

  it('should throw error for unknown command', () => {
    const config = defineConfig({
      commands: {
        create: defineCommand({ action: vi.fn() }),
      },
    });

    expect(() => processConfig(config, ['unknown'])).toThrow(/Unknown command:.*unknown/);
  });

  it('should throw error for missing command', () => {
    const config = defineConfig({
      commands: {
        create: defineCommand({ action: vi.fn() }),
      },
    });

    expect(() => processConfig(config, [])).toThrow(ZodlineError);
    expect(() => processConfig(config, [])).toThrow('No command specified.');
  });

  it('should normalize single values to arrays', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          options: defineOptions(
            z.object({
              files: z.array(z.string()),
            }),
          ),
          action: vi.fn(),
        }),
      },
    });

    const result = processConfig(config, ['test', '--files', 'single.txt']);
    expect(result.options).toEqual({ files: ['single.txt'] });
  });

  it('should use default command when no command is specified', () => {
    const defaultCommand = defineCommand({
      description: 'Default command',
      options: defineOptions(
        z.object({
          name: z.string().default('world'),
        }),
      ),
      action: vi.fn(),
    });

    const config = defineConfig({
      commands: {
        greet: defaultCommand,
      },
      defaultCommand,
    });

    const result = processConfig(config, ['--name', 'Alice']);
    expect(result.command).toBe(defaultCommand);
    expect(result.options).toEqual({ name: 'Alice' });
    expect(result.args).toEqual([]);
  });

  it('should still show help when --help is passed with default command', () => {
    const defaultCommand = defineCommand({
      description: 'Default command',
      action: vi.fn(),
    });

    const config = defineConfig({
      commands: {
        greet: defaultCommand,
      },
      defaultCommand,
    });

    expect(() => processConfig(config, ['--help'])).toThrow('process.exit called');
    expect(console.log).toHaveBeenCalled();
  });

  it('should throw error for unknown command even with default command configured', () => {
    const defaultCommand = defineCommand({
      description: 'Default command',
      action: vi.fn(),
    });

    const config = defineConfig({
      commands: {
        greet: defaultCommand,
      },
      defaultCommand,
    });

    expect(() => processConfig(config, ['unknown'])).toThrow(/Unknown command:.*unknown/);
  });

  it('should throw error for unknown long option', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          options: defineOptions(
            z.object({
              verbose: z.boolean().default(false),
            }),
          ),
          action: vi.fn(),
        }),
      },
    });

    expect(() => processConfig(config, ['test', '--unknown'])).toThrow(ZodlineError);
    expect(() => processConfig(config, ['test', '--unknown'])).toThrow('Unknown option: \x1b[36m--unknown\x1b[0m');
  });

  it('should throw error for unknown short option', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          options: defineOptions(
            z.object({
              verbose: z.boolean().default(false),
            }),
            { v: 'verbose' },
          ),
          action: vi.fn(),
        }),
      },
    });

    expect(() => processConfig(config, ['test', '-x'])).toThrow(ZodlineError);
    expect(() => processConfig(config, ['test', '-x'])).toThrow('Unknown option: \x1b[36m-x\x1b[0m');
  });

  it('should throw error for unknown option with kebab-case display', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          options: defineOptions(
            z.object({
              verbose: z.boolean().default(false),
            }),
          ),
          action: vi.fn(),
        }),
      },
    });

    expect(() => processConfig(config, ['test', '--no-build'])).toThrow(ZodlineError);
    expect(() => processConfig(config, ['test', '--no-build'])).toThrow('Unknown option: \x1b[36m--no-build\x1b[0m');
  });

  it('should allow valid kebab-case options', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          options: defineOptions(
            z.object({
              androidMax: z.string(),
              verbose: z.boolean().default(false),
            }),
          ),
          action: vi.fn(),
        }),
      },
    });

    const result = processConfig(config, ['test', '--android-max', '10', '--verbose']);
    expect(result.options).toEqual({ androidMax: '10', verbose: true });
  });

  it('should allow standard help and version flags', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          options: defineOptions(
            z.object({
              name: z.string(),
            }),
          ),
          action: vi.fn(),
        }),
      },
    });

    // Help should trigger exit, not unknown option error
    expect(() => processConfig(config, ['test', '--help'])).toThrow('process.exit called');
  });

  it('should throw error for unknown option when no schema defined', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          action: vi.fn(),
        }),
      },
    });

    expect(() => processConfig(config, ['test', '--unknown'])).toThrow(ZodlineError);
    expect(() => processConfig(config, ['test', '--unknown'])).toThrow('Unknown option: \x1b[36m--unknown\x1b[0m');
  });

  it('should throw error for a bare double dash when no schema defined', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          action: vi.fn(),
        }),
      },
    });

    expect(() => processConfig(config, ['test', '--'])).toThrow('Unknown option: \x1b[36m--\x1b[0m');
  });

  it('should allow help and version when no schema defined', () => {
    const config = defineConfig({
      meta: { version: '1.0.0' },
      commands: {
        test: defineCommand({
          action: vi.fn(),
        }),
      },
    });

    // Help should trigger exit, not unknown option error
    expect(() => processConfig(config, ['test', '--help'])).toThrow('process.exit called');
  });

  it('should throw error for a positional argument when no args schema is defined', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          action: vi.fn(),
        }),
      },
    });

    expect(() => processConfig(config, ['test', 'extra'])).toThrow(ZodlineError);
    expect(() => processConfig(config, ['test', 'extra'])).toThrow('Unexpected argument: \x1b[36mextra\x1b[0m');
  });

  it('should show examples in command help', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          examples: ['my-cli test --name World', 'NAME=World my-cli test'],
          action: vi.fn(),
        }),
      },
    });

    expect(() => processConfig(config, ['test', '--help'])).toThrow('process.exit called');
    expect(console.log).toHaveBeenCalledWith('\n\x1b[1mEXAMPLES\x1b[0m\n');
    expect(console.log).toHaveBeenCalledWith('  \x1b[36mmy-cli test --name World\x1b[0m');
    expect(console.log).toHaveBeenCalledWith('  \x1b[36mNAME=World my-cli test\x1b[0m');
  });

  it('should not show an examples section when no examples are defined', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          action: vi.fn(),
        }),
      },
    });

    expect(() => processConfig(config, ['test', '--help'])).toThrow('process.exit called');
    expect(console.log).not.toHaveBeenCalledWith('\n\x1b[1mEXAMPLES\x1b[0m\n');
  });

  describe('empty flag values', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          options: defineOptions(
            z.object({
              environment: z.union([z.string(), z.boolean()]).optional(),
              verbose: z.boolean().optional(),
            }),
            { e: 'environment' },
          ),
          action: vi.fn(),
        }),
      },
    });

    it('should parse an empty argument after a long flag as an empty string', () => {
      const result = processConfig(config, ['test', '--environment', '']);
      expect(result.options).toEqual({ environment: '' });
    });

    it('should parse an empty equals value as an empty string', () => {
      const result = processConfig(config, ['test', '--environment=']);
      expect(result.options).toEqual({ environment: '' });
    });

    it('should parse an empty argument after a short flag as an empty string', () => {
      const result = processConfig(config, ['test', '-e', '']);
      expect(result.options).toEqual({ environment: '' });
    });

    it('should parse a flag at the end of argv as true', () => {
      const result = processConfig(config, ['test', '--environment']);
      expect(result.options).toEqual({ environment: true });
    });

    it('should parse a flag followed by another flag as true', () => {
      const result = processConfig(config, ['test', '--environment', '--verbose']);
      expect(result.options).toEqual({ environment: true, verbose: true });
    });
  });

  describe('lone dash', () => {
    const config = defineConfig({
      commands: {
        test: defineCommand({
          args: z.array(z.string()),
          options: defineOptions(
            z.object({
              environment: z.string().optional(),
              verbose: z.boolean().optional(),
            }),
            { e: 'environment' },
          ),
          action: vi.fn(),
        }),
      },
    });

    it('should parse a lone dash after a long flag as its value', () => {
      const result = processConfig(config, ['test', '--environment', '-']);
      expect(result.options).toEqual({ environment: '-' });
      expect(result.args).toEqual([]);
    });

    it('should parse a lone dash after a short flag as its value', () => {
      const result = processConfig(config, ['test', '-e', '-']);
      expect(result.options).toEqual({ environment: '-' });
      expect(result.args).toEqual([]);
    });

    it('should keep a lone dash as a positional argument when no flag stands before it', () => {
      const result = processConfig(config, ['test', '-', '--verbose']);
      expect(result.options).toEqual({ verbose: true });
      expect(result.args).toEqual(['-']);
    });

    it('should keep a lone dash as a positional argument when a boolean flag stands before it', () => {
      const result = processConfig(config, ['test', '--verbose', '-']);
      expect(result.options).toEqual({ verbose: true });
      expect(result.args).toEqual(['-']);
    });
  });

  describe('boolean flags', () => {
    const config = defineConfig({
      commands: {
        copy: defineCommand({
          args: z.array(z.string()),
          options: defineOptions(
            z.object({
              dryRun: z.boolean().default(false),
              protected: z.union([z.boolean(), z.stringbool()]).optional(),
              verbose: z.boolean().optional(),
            }),
            { v: 'verbose' },
          ),
          action: vi.fn(),
        }),
      },
    });

    it('should keep the argument after a boolean flag as a positional argument', () => {
      const result = processConfig(config, ['copy', '--verbose', 'in.txt', 'out.txt']);
      expect(result.options).toEqual({ dryRun: false, verbose: true });
      expect(result.args).toEqual(['in.txt', 'out.txt']);
    });

    it('should keep the argument after the alias of a boolean flag as a positional argument', () => {
      const result = processConfig(config, ['copy', '-v', 'in.txt']);
      expect(result.options).toEqual({ dryRun: false, verbose: true });
      expect(result.args).toEqual(['in.txt']);
    });

    it('should keep the argument after a kebab-case boolean flag with a default as a positional argument', () => {
      const result = processConfig(config, ['copy', '--dry-run', 'in.txt']);
      expect(result.options).toEqual({ dryRun: true });
      expect(result.args).toEqual(['in.txt']);
    });

    it('should pass false after a boolean flag to the schema as its value and never read the flag as set', () => {
      expect(() => processConfig(config, ['copy', '--verbose', 'false'])).toThrow(z.ZodError);
    });

    it('should take the next argument as the value of a flag whose type is not a boolean alone', () => {
      const result = processConfig(config, ['copy', '--protected', 'false', 'in.txt']);
      expect(result.options).toEqual({ dryRun: false, protected: false });
      expect(result.args).toEqual(['in.txt']);
    });

    it('should show the command help when a positional argument follows --help', () => {
      expect(() => processConfig(config, ['copy', '--help', 'in.txt'])).toThrow('process.exit called');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('copy'));
    });

    it('should pass the argument after a boolean flag to the default command', () => {
      const defaultConfig = defineConfig({
        commands: {},
        defaultCommand: defineCommand({
          args: z.array(z.string()),
          options: defineOptions(z.object({ verbose: z.boolean().optional() })),
          action: vi.fn(),
        }),
      });

      const result = processConfig(defaultConfig, ['--verbose', 'in.txt']);
      expect(result.options).toEqual({ verbose: true });
      expect(result.args).toEqual(['in.txt']);
    });

    it('should never read the command name as a positional argument when a boolean flag stands before it', () => {
      expect(() => processConfig(config, ['--verbose', 'in.txt', 'copy', 'out.txt'])).toThrow(z.ZodError);
    });

    it('should never pass a command name after a boolean flag to the default command', () => {
      const defaultConfig = defineConfig({
        commands: { build: defineCommand({ action: vi.fn() }) },
        defaultCommand: defineCommand({
          args: z.array(z.string()),
          options: defineOptions(z.object({ verbose: z.boolean().optional() })),
          action: vi.fn(),
        }),
      });

      expect(() => processConfig(defaultConfig, ['--verbose', 'build'])).toThrow(z.ZodError);
    });
  });

  describe('multi-word commands', () => {
    const configSet = defineCommand({
      description: 'Set a config value',
      args: z.array(z.string()),
      action: vi.fn(),
    });
    const configGet = defineCommand({ description: 'Get a config value', action: vi.fn() });
    const login = defineCommand({ description: 'Log in', args: z.array(z.string()), action: vi.fn() });
    const config = defineConfig({
      meta: { name: 'my-cli' },
      commands: {
        'config set': configSet,
        'config get': configGet,
        login,
      },
    });

    const getLoggedOutput = () => vi.mocked(console.log).mock.calls.flat().join('\n');

    it('should match a multi-word command', () => {
      const result = processConfig(config, ['config', 'set']);
      expect(result.command).toBe(configSet);
    });

    it('should pass the tokens after a multi-word command as args', () => {
      const result = processConfig(config, ['config', 'set', 'theme', 'dark']);
      expect(result.command).toBe(configSet);
      expect(result.args).toEqual(['theme', 'dark']);
    });

    it('should still pass the tokens after a single-word command as args', () => {
      const result = processConfig(config, ['login', 'alice']);
      expect(result.command).toBe(login);
      expect(result.args).toEqual(['alice']);
    });

    it('should prefer the longest matching command name', () => {
      const configCommand = defineCommand({ args: z.array(z.string()), action: vi.fn() });
      const configWithOverlap = defineConfig({
        commands: {
          config: configCommand,
          'config set': configSet,
        },
      });

      expect(processConfig(configWithOverlap, ['config', 'set', 'theme']).command).toBe(configSet);
      expect(processConfig(configWithOverlap, ['config', 'theme']).command).toBe(configCommand);
    });

    it('should show command help with the full multi-word name', () => {
      expect(() => processConfig(config, ['config', 'set', '--help'])).toThrow('process.exit called');
      expect(getLoggedOutput()).toContain('my-cli config set');
    });

    it('should show only the commands of a group when --help is passed for the group', () => {
      expect(() => processConfig(config, ['config', '--help'])).toThrow('process.exit called');
      expect(getLoggedOutput()).toContain('config set');
      expect(getLoggedOutput()).toContain('config get');
      expect(getLoggedOutput()).not.toContain('login');
    });

    it('should show the group help and throw for an unknown command within a group', () => {
      expect(() => processConfig(config, ['config', 'unknown'])).toThrow(ZodlineError);
      expect(() => processConfig(config, ['config', 'unknown'])).toThrow(/Unknown command:.*config unknown/);
      expect(getLoggedOutput()).not.toContain('login');
    });

    it('should not resolve inherited object properties as commands', () => {
      expect(() => processConfig(config, ['constructor'])).toThrow(/Unknown command:.*constructor/);
    });
  });
});
