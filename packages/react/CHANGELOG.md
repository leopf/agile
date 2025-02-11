# Change Log

## 0.2.3

### Patch Changes

- 36b235a: #### ❗️ Breaking Change

  ```ts
  MY_STATE.persist('persistKey'); -> MY_STATE.persist({key: 'persistKey'});
  ```

  #### :rocket: New Feature

  - `core`
    - [#214](https://github.com/agile-ts/agile/pull/214) add migration callback ([@bennodev19](https://github.com/bennodev19))

  #### :nail_care: Polish

  - `logger`
    - [#210](https://github.com/agile-ts/agile/pull/210) Refactor logger ([@bennodev19](https://github.com/bennodev19))
  - `api`, `core`, `event`, `logger`, `multieditor`, `proxytree`, `react`, `utils`, `vue`
    - [#209](https://github.com/agile-ts/agile/pull/209) Outsource react hooks ([@bennodev19](https://github.com/bennodev19))

  #### Committers: 1

  - BennoDev ([@bennodev19](https://github.com/bennodev19))

- Updated dependencies [36b235a]
  - @agile-ts/core@0.2.7
  - @agile-ts/proxytree@0.0.9

## 0.2.2

### Patch Changes

- e6ef3a7: #### :bug: Bug Fix

  - `core`, `multieditor`, `react`
    - [#204](https://github.com/agile-ts/agile/pull/204) fix multieditor ([@bennodev19](https://github.com/bennodev19))
  - `api`, `core`, `cra-template-agile-typescript`, `cra-template-agile`, `event`, `logger`, `multieditor`, `proxytree`, `react`, `utils`, `vue`
    - [#201](https://github.com/agile-ts/agile/pull/201) fix commonjs bundle ([@bennodev19](https://github.com/bennodev19))

  #### Committers: 1

  - BennoDev ([@bennodev19](https://github.com/bennodev19))

- Updated dependencies [e6ef3a7]
  - @agile-ts/core@0.2.6
  - @agile-ts/proxytree@0.0.8

## 0.2.1

### Patch Changes

- 488c87c: #### :nail_care: Polish

  - `api`, `core`, `cra-template-agile-typescript`, `cra-template-agile`, `event`, `logger`, `multieditor`, `proxytree`, `react`, `utils`, `vue`
    - [#194](https://github.com/agile-ts/agile/pull/194) Commonjs issue ([@bennodev19](https://github.com/bennodev19))
  - `core`
    - [#195](https://github.com/agile-ts/agile/pull/195) Removed `internal.ts` and resolved cycle dependencies ([@bennodev19](https://github.com/bennodev19))

  #### Committers: 1

  - BennoDev ([@bennodev19](https://github.com/bennodev19))

- Updated dependencies [488c87c]
  - @agile-ts/core@0.2.4
  - @agile-ts/proxytree@0.0.7

## 0.2.0

### Patch Changes

- aae6455: #### :rocket: New Feature

  - `core`, `event`, `logger`, `multieditor`, `react`, `utils`
    - [#188](https://github.com/agile-ts/agile/pull/188) Tree shakeable support ([@bennodev19](https://github.com/bennodev19))

  #### :nail_care: Polish

  - `core`
    - [#189](https://github.com/agile-ts/agile/pull/189) Optimize collection rebuilds ([@bennodev19](https://github.com/bennodev19))
  - `api`, `core`, `cra-template-agile-typescript`, `cra-template-agile`, `event`, `logger`, `multieditor`, `proxytree`, `react`, `utils`, `vue`
    - [#187](https://github.com/agile-ts/agile/pull/187) Tree shakeable support ([@bennodev19](https://github.com/bennodev19))

  #### Committers: 1

  - BennoDev ([@bennodev19](https://github.com/bennodev19))

- Updated dependencies [aae6455]
  - @agile-ts/core@0.2.0
  - @agile-ts/proxytree@0.0.6

## 0.1.2

### Patch Changes

- 2f2724f: #### :bug: Bug Fix

  - `core`
    - [#176](https://github.com/agile-ts/agile/pull/176) Fix persisting dynamically added items ([@bennodev19](https://github.com/bennodev19))

  #### :nail_care: Polish

  - `api`, `core`, `event`, `logger`, `multieditor`, `react`, `utils`
    - [#177](https://github.com/agile-ts/agile/pull/177) Optimize default configurations ([@bennodev19](https://github.com/bennodev19))

  #### Committers: 1

  - BennoDev ([@bennodev19](https://github.com/bennodev19))

- Updated dependencies [2f2724f]
  - @agile-ts/core@0.1.2

## 0.1.1

### Patch Changes

- cef61b6: #### :rocket: New Feature

  - `react`
    - [#171](https://github.com/agile-ts/agile/pull/171) Add deps array to useAgile() hook ([@bennodev19](https://github.com/bennodev19))
  - `core`, `event`, `react`, `vue`
    - [#166](https://github.com/agile-ts/agile/pull/166) Shared Agile Instance ([@bennodev19](https://github.com/bennodev19))

  #### :nail_care: Polish

  - `api`, `core`, `event`, `logger`, `multieditor`, `react`, `utils`
    - [#168](https://github.com/agile-ts/agile/pull/168) Performance optimization ([@bennodev19](https://github.com/bennodev19))
  - `core`, `event`, `react`, `vue`
    - [#166](https://github.com/agile-ts/agile/pull/166) Shared Agile Instance ([@bennodev19](https://github.com/bennodev19))

  #### Committers: 1

  - BennoDev ([@bennodev19](https://github.com/bennodev19))

- Updated dependencies [cef61b6]
  - @agile-ts/core@0.1.1
  - @agile-ts/proxytree@0.0.5

## 0.1.0

### Minor Changes

- 855a921: #### :rocket: New Feature

  - `core`, `multieditor`, `react`, `vue`
    - [#161](https://github.com/agile-ts/agile/pull/161) Subscribe to Group value or output ([@bennodev19](https://github.com/bennodev19))
  - `core`
    - [#160](https://github.com/agile-ts/agile/pull/160) added null option to Selector ([@bennodev19](https://github.com/bennodev19))
    - [#159](https://github.com/agile-ts/agile/pull/159) make compute method async compatible ([@bennodev19](https://github.com/bennodev19))

  #### :bug: Bug Fix

  - `core`
    - [#152](https://github.com/agile-ts/agile/pull/152) Fix remove selected Item loop ([@bennodev19](https://github.com/bennodev19))

  #### :nail_care: Polish

  - `core`, `multieditor`, `react`, `vue`
    - [#161](https://github.com/agile-ts/agile/pull/161) Subscribe to Group value or output ([@bennodev19](https://github.com/bennodev19))
  - `core`, `cra-template-agile-typescript`, `cra-template-agile`, `event`, `logger`, `multieditor`, `proxytree`, `react`, `utils`, `vue`
    - [#153](https://github.com/agile-ts/agile/pull/153) refactor core descriptions ([@bennodev19](https://github.com/bennodev19))
  - `core`, `event`, `react`, `vue`
    - [#154](https://github.com/agile-ts/agile/pull/154) Optimise Runtime ([@bennodev19](https://github.com/bennodev19))
  - `core`, `proxytree`
    - [#150](https://github.com/agile-ts/agile/pull/150) Outsource log messages ([@bennodev19](https://github.com/bennodev19))

  #### Committers: 1

  - BennoDev ([@bennodev19](https://github.com/bennodev19))

### Patch Changes

- Updated dependencies [855a921]
  - @agile-ts/core@0.1.0
  - @agile-ts/proxytree@0.0.4

## 0.0.18

### Patch Changes

- 7aeadd5: #### :rocket: New Feature

  - `core`, `react`, `vue`
    - [#144](https://github.com/agile-ts/agile/pull/144) Vue integration ([@bennodev19](https://github.com/bennodev19))

  #### :nail_care: Polish

  - `core`, `react`, `vue`
    - [#144](https://github.com/agile-ts/agile/pull/144) Vue integration ([@bennodev19](https://github.com/bennodev19))
  - Fixed typos in ReadMe's

  #### Committers: 1

  - BennoDev ([@bennodev19](https://github.com/bennodev19))

- Updated dependencies [7aeadd5]
  - @agile-ts/core@0.0.17
  - @agile-ts/proxytree@0.0.3

## 0.0.17

### Patch Changes

- f561c34: - added move method
  - fixed 0 as itemKey issue
  - fixed computed tracking
- Updated dependencies [f561c34]
  - @agile-ts/core@0.0.16

## 0.0.16

### Patch Changes

- 616681d: - Outsourced Logger and Utils from the `core` package.
  - Created Proxy Tree
  - Added `useProxy` Hook to `react` package
  - Updated `core` to work with Proxy KeyMap
- Updated dependencies [616681d]
  - @agile-ts/core@0.0.15
  - @agile-ts/proxytree@0.0.2

## 0.0.15

### Patch Changes

- 63b8760: - extracted fromatDeps
  - made globalBind optional
  - optimized internal classes
  - optimized packages.json for better npm ranking score
  - fixed collection type issue
- Updated dependencies [63b8760]
  - @agile-ts/core@0.0.14

## 0.0.14

### Patch Changes

- b669e3b: fixed bugs

## 0.0.13

### Patch Changes

- 7f29a97: fixed bugs and increased versions
- Updated dependencies [7f29a97]
  - @agile-ts/core@0.0.13

## 0.0.12

### Patch Changes

- Updated dependencies [9071dd6]
  - @agile-ts/core@0.0.12

## 0.0.11

### Patch Changes

- Updated dependencies [93ead02]
  - @agile-ts/core@0.0.11

## 0.0.10

### Patch Changes

- 9a09652: fixted some bugs
- Updated dependencies [9a09652]
  - @agile-ts/core@0.0.10

## 0.0.9

### Patch Changes

- c3a8217: Improved ReadMe
- Updated dependencies [c3a8217]
  - @agile-ts/core@0.0.9

## 0.0.8

### Patch Changes

- 198c212: added prettier and eslint and fixed some small issues
- Updated dependencies [198c212]
  - @agile-ts/core@0.0.8

## 0.0.7

### Patch Changes

- 7f89382: Updated ReadMe's
- Updated dependencies [7f89382]
  - @agile-ts/core@0.0.7

## 0.0.6

### Patch Changes

- 86e6890: Updated Tests in Core | Fixed some Bugs
- Updated dependencies [86e6890]
  - @agile-ts/core@0.0.6

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.0.5](https://github.com/agile-ts/agile/compare/v0.0.4...v0.0.5) (2020-11-05)

**Note:** Version bump only for package @agile-ts/react

## 0.0.4 (2020-11-03)

**Note:** Version bump only for package @agile-ts/react
