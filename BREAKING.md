# Breaking Changes

This is a comprehensive list of the breaking changes introduced in the releases of this project.

## Versions

- [Version 0.4.0](#version-040)
- [Version 0.3.0](#version-030)

## Version 0.4.0

### Positional Arguments Without A Schema

A command without an `args` schema no longer takes positional arguments. Before, they were passed to `action` as a raw `string[]` without validation. Now `processConfig` throws a `ZodlineError`:

```diff
  my-cli login alice
- # runs login with the args ['alice']
+ # Unexpected argument: alice
```

**Attention:** Declare an `args` schema on every command that reads positional arguments. `z.array(z.string())` takes them as before:

```diff
  const login = defineCommand({
+   args: z.array(z.string()),
    action: async (options, args) => {
      // ...
    },
  });
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
