#!/usr/bin/env node
import { z } from 'zod';
import { defineConfig, defineCommand, defineOptions, processConfig } from './dist/index.js';

// Define a simple command to greet someone
const greetCommand = defineCommand({
  description: 'Greet someone',
  examples: ['simple-cli greet --name World', 'simple-cli greet -n World --loud'],
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

// Define a command that copies a file
const copyCommand = defineCommand({
  description: 'Copy a file to another location',
  args: z.tuple([
    z.string().describe('Source file'),
    z.string().describe('Destination file'),
  ]),
  options: defineOptions(
    z.object({
      verbose: z.boolean().default(false).describe('Show detailed output'),
    }),
    { v: 'verbose' }
  ),
  action: async (options, args) => {
    const [source, dest] = args;
    
    if (options.verbose) {
      console.log(`Copying ${source} to ${dest}...`);
    }
    
    console.log(`✅ Copied ${source} to ${dest}`);
  },
});

// Configure the CLI
const config = defineConfig({
  meta: {
    name: 'simple-cli',
    version: '1.0.0',
    description: 'A simple example CLI',
  },
  commands: {
    greet: greetCommand,
    copy: copyCommand,
  },
});

// Process and run
try {
  const result = processConfig(config, process.argv.slice(2));
  await result.command.action(result.options, result.args);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}