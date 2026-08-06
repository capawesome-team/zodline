import { z } from 'zod';

export class ZodlineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZodlineError';
  }
}

export interface OptionsDefinition<T extends z.ZodObject<any> = z.ZodObject<any>> {
  schema: T;
  aliases?: Record<string, string> | undefined;
}

export interface CommandDefinition<
  TOptions extends z.ZodObject<any> = z.ZodObject<any>,
  TArgs extends z.ZodType | undefined = undefined,
> {
  description?: string;
  options?: OptionsDefinition<TOptions>;
  args?: TArgs;
  action: (
    options: TOptions extends z.ZodObject<any> ? z.infer<TOptions> : {},
    args: TArgs extends z.ZodType ? z.infer<TArgs> : undefined,
  ) => void | Promise<void>;
}

export interface DefineConfig<TCommands extends Record<string, CommandDefinition<any, any>> = {}> {
  meta?: {
    name?: string;
    version?: string;
    description?: string;
  };
  commands: TCommands;
  defaultCommand?: CommandDefinition<any, any>;
}

export interface ProcessResult<TCommand extends CommandDefinition<any, any> = CommandDefinition<any, any>> {
  command: TCommand;
  options: TCommand extends CommandDefinition<infer TOptions, any>
    ? TOptions extends z.ZodObject<any>
      ? z.infer<TOptions>
      : {}
    : any;
  args: TCommand extends CommandDefinition<any, infer TArgs>
    ? TArgs extends z.ZodType
      ? z.infer<TArgs>
      : undefined
    : any;
}
