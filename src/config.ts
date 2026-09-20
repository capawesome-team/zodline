import { z } from 'zod';
import type { OptionsDefinition, CommandDefinition, DefineConfig } from './types.js';

export function defineOptions<T extends z.ZodObject<any> = z.ZodObject<any>>(
  schema: T,
  aliases?: Record<string, string>,
): OptionsDefinition<T> {
  return { schema, aliases };
}

export function defineCommand<
  TOptions extends OptionsDefinition<any> | undefined = undefined,
  TArgs extends z.ZodType | undefined = undefined,
>(config: {
  description?: string;
  examples?: string[];
  options?: TOptions;
  args?: TArgs;
  action: (
    options: TOptions extends OptionsDefinition<infer U> ? z.infer<U> : {},
    args: TArgs extends z.ZodType ? z.infer<TArgs> : undefined,
  ) => void | Promise<void>;
}): CommandDefinition<TOptions extends OptionsDefinition<infer U> ? U : z.ZodObject<any>, TArgs> {
  return config as any;
}

export function defineConfig<TCommands extends Record<string, CommandDefinition<any, any>> = {}>(
  config: DefineConfig<TCommands>,
): DefineConfig<TCommands> {
  return config;
}
