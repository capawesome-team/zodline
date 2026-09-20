# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.3.1](https://github.com/capawesome-team/zodline/compare/v0.3.0...v0.3.1) (2026-09-20)


### Features

* add `examples` field to `defineCommand` ([#10](https://github.com/capawesome-team/zodline/issues/10)) ([5905362](https://github.com/capawesome-team/zodline/commit/59053627efa4028163dc482b21745686898a02cf))
* support multi-word command names ([#12](https://github.com/capawesome-team/zodline/issues/12)) ([6a4c09b](https://github.com/capawesome-team/zodline/commit/6a4c09bce5071667b161af448ac1f1ccd3a2bae2))

## [0.3.0](https://github.com/capawesome-team/zodline/compare/v0.2.0...v0.3.0) (2026-08-06)


### ⚠ BREAKING CHANGES

* package renamed from @robingenz/zli to zodline; the
ZliError export is now ZodlineError.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

### Features

* rename package to zodline ([39b07ab](https://github.com/capawesome-team/zodline/commit/39b07ab466c389a63cd230a630e318042beb582d))

## [0.2.0](https://github.com/robingenz/zli/compare/v0.1.7...v0.2.0) (2025-09-11)


### ⚠ BREAKING CHANGES

* An error is now thrown when an unsupported option is used.

### Features

* throw error if option is unknown ([#6](https://github.com/robingenz/zli/issues/6)) ([6858b73](https://github.com/robingenz/zli/commit/6858b73ad6420e6baa16e3db14e47e502086a1e5))

## [0.1.7](https://github.com/robingenz/zli/compare/v0.1.6...v0.1.7) (2025-09-01)


### Bug Fixes

* `Argument of type 'any' is not assignable to parameter of type 'never'` error when `args` was used ([ee0185e](https://github.com/robingenz/zli/commit/ee0185e81156d59038ab03fa1b5490c7a8fe8f8b))

## [0.1.6](https://github.com/robingenz/zli/compare/v0.1.5...v0.1.6) (2025-09-01)


### Bug Fixes

* `Argument of type 'any' is not assignable to parameter of type 'never'` error when `args` was used ([d768e96](https://github.com/robingenz/zli/commit/d768e96c4bd0c570c7a10d6799f43435008976e8))

## [0.1.5](https://github.com/robingenz/zli/compare/v0.1.4...v0.1.5) (2025-08-26)


### Features

* support `--version` argument ([f447b95](https://github.com/robingenz/zli/commit/f447b951984d17cee2335f2dd0f270d997aafd5b))

## [0.1.4](https://github.com/robingenz/zli/compare/v0.1.3...v0.1.4) (2025-08-24)


### Bug Fixes

* do not export `ZliError` as type ([0e0e52a](https://github.com/robingenz/zli/commit/0e0e52ab1f9797d2a23dae10da135f03afe0d8e3))

## [0.1.3](https://github.com/robingenz/zli/compare/v0.1.2...v0.1.3) (2025-08-24)


### Bug Fixes

* export `ZliError` type ([64773f5](https://github.com/robingenz/zli/commit/64773f52b2cb98f3d39547b0f12b0f26e316b868))

## [0.1.2](https://github.com/robingenz/zli/compare/v0.1.1...v0.1.2) (2025-08-24)


### Features

* implement `ZliError` class for improved error handling ([d5e632d](https://github.com/robingenz/zli/commit/d5e632d05283daaa4a82f28c3e2b7521af44641a))

## [0.1.1](https://github.com/robingenz/zli/compare/v0.1.0...v0.1.1) (2025-08-23)


### Features

* display default values in command help ([#3](https://github.com/robingenz/zli/issues/3)) ([e8debdb](https://github.com/robingenz/zli/commit/e8debdbf1d2805bd283a886de9f3103c53adbb6b)), closes [#1](https://github.com/robingenz/zli/issues/1)
* support default commands ([#4](https://github.com/robingenz/zli/issues/4)) ([b147b87](https://github.com/robingenz/zli/commit/b147b870543ac6e7f8115f01bd7bc06703ffda7e)), closes [#2](https://github.com/robingenz/zli/issues/2)

## 0.1.0 (2025-08-19)


### ⚠ BREAKING CHANGES

* remove the global options

* remove the global options ([fdc7dd0](https://github.com/robingenz/zli/commit/fdc7dd0ee36eaffaf8da3b35284cb4bf4aa84cad))


### Bug Fixes

* display option descriptions correctly ([91b405c](https://github.com/robingenz/zli/commit/91b405c7477da6350b19e50bdb4c96f4bf984cd4))
