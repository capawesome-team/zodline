# Breaking Changes

This is a comprehensive list of the breaking changes introduced in the releases of this project.

## Versions

- [Version 0.4.0](#version-040)
- [Version 0.3.0](#version-030)

## Version 0.4.0

### Lone Dash After A Flag

A lone `-` directly after a flag is now the value of that flag. Before, the flag became `true` and the `-` a positional argument.

```diff
  my-cli build --output -
- # output: true, args: ['-']
+ # output: '-', args: []
```

**Attention:** A boolean switch directly before a positional `-` no longer works. The switch takes the `-` as its value, and a `z.boolean()` schema rejects it. Put the switch after the `-` or before another flag:

```diff
- my-cli copy --verbose - out.txt
+ my-cli copy - out.txt --verbose
```

## Version 0.3.0

### Renamed Package

The package has been renamed from `@robingenz/zli` to `zodline`. The old package is no longer published.

```bash
npm uninstall @robingenz/zli
npm install zodline
```

Update all import specifiers accordingly:

```diff
- import { ... } from '@robingenz/zli';
+ import { ... } from 'zodline';
```

### Renamed `ZliError` Class

The exported `ZliError` class has been renamed to `ZodlineError`. Its `name` property has changed from `'ZliError'` to `'ZodlineError'` accordingly.

```diff
- import { ZliError } from '@robingenz/zli';
+ import { ZodlineError } from 'zodline';
```

**Attention:** Update any `instanceof` checks and any code comparing `error.name === 'ZliError'`.

All other exports (`defineConfig`, `defineCommand`, `defineOptions`, `processConfig`, and the `OptionsDefinition`, `CommandDefinition`, `DefineConfig`, and `ProcessResult` types) remain unchanged.
