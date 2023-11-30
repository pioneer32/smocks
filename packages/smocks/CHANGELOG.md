# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-alpha.36](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.35...v1.0.0-alpha.36) (2023-11-30)

### Bug Fixes

- Improve importing config as commonjs ([d254529](https://github.com/pioneer32/smocks/commit/d254529c097f8b63e20767f7a25afae68efafbb7))

# [1.0.0-alpha.35](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.34...v1.0.0-alpha.35) (2023-11-29)

### Bug Fixes

- For fixtureGenerators, "fixture/{name}" should be logged ([41f0684](https://github.com/pioneer32/smocks/commit/41f068406addf54cf9e94e20c6f173f25a854c39))

### Features

- Support multiple instances of the mock response variant. If calling predicates results in multiple instances, a random one is selected. No predicate is considered () => true; ([d593bf3](https://github.com/pioneer32/smocks/commit/d593bf3132f7e367450458d3a74f7264fab9b80d))

# [1.0.0-alpha.34](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.33...v1.0.0-alpha.34) (2023-11-29)

### Bug Fixes

- Packaging of esm and cjs ([37d0741](https://github.com/pioneer32/smocks/commit/37d0741e112d8f0c6650c3eaf659426847a010ec))

# [1.0.0-alpha.33](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.32...v1.0.0-alpha.33) (2023-11-29)

**Note:** Version bump only for package @pioneer32/smocks

# [1.0.0-alpha.32](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.31...v1.0.0-alpha.32) (2023-11-29)

### Bug Fixes

- Remove webpack for cli ([dadec84](https://github.com/pioneer32/smocks/commit/dadec8481094c4e07428967d1f67e4a472424b54))

# [1.0.0-alpha.31](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.30...v1.0.0-alpha.31) (2023-11-29)

### Bug Fixes

- Fix issue when fixtureGenerator wasn't recognised by the cli util ([5db87c5](https://github.com/pioneer32/smocks/commit/5db87c5397d3024d43997f1bcba4965ff1c0c3b9))

# [1.0.0-alpha.30](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.29...v1.0.0-alpha.30) (2023-11-29)

### Features

- First release of featureGenerator ([92cadf0](https://github.com/pioneer32/smocks/commit/92cadf00210400ba126e118a0c8655c0475b039f))

# [1.0.0-alpha.29](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.28...v1.0.0-alpha.29) (2023-08-25)

### Bug Fixes

- improve dynamic route loader ([7bce54c](https://github.com/pioneer32/smocks/commit/7bce54c9e67ac7e58d5c0a1764c0c44e47f69c5d))

# [1.0.0-alpha.28](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.27...v1.0.0-alpha.28) (2023-08-15)

### Bug Fixes

- building with tsx instead ([2812421](https://github.com/pioneer32/smocks/commit/28124214d8febc292543ca382b61c41b99c440d4))

# [1.0.0-alpha.27](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.26...v1.0.0-alpha.27) (2023-08-15)

**Note:** Version bump only for package @pioneer32/smocks

# [1.0.0-alpha.26](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.25...v1.0.0-alpha.26) (2023-08-15)

**Note:** Version bump only for package @pioneer32/smocks

# [1.0.0-alpha.25](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.24...v1.0.0-alpha.25) (2023-08-15)

### Bug Fixes

- Switch onto bundling with webpack, so that internal packages are bundled in ([634a76b](https://github.com/pioneer32/smocks/commit/634a76b3b337ffa9e5af58445823eb644a2f2ef2))

# [1.0.0-alpha.24](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.23...v1.0.0-alpha.24) (2023-08-03)

### Bug Fixes

- Disable automatic caching responses ([c65d175](https://github.com/pioneer32/smocks/commit/c65d1753fc4505e5fd24f9505e7a18f9370f5a2c))
- Routes can now be updated without restarting Smocks. Switch from ts-import to an own implementation. ([e82223b](https://github.com/pioneer32/smocks/commit/e82223bb68ce421019769559e8a022ef7d095fc9))
- Update vulnerable packages ([a9a832b](https://github.com/pioneer32/smocks/commit/a9a832b6f15aa29baa4cfd71c5bbcb56e258943b))

# [1.0.0-alpha.23](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.22...v1.0.0-alpha.23) (2023-07-26)

### Features

- Disable ts-import cache ([a18b11d](https://github.com/pioneer32/smocks/commit/a18b11d37ab53e63e2ee69f94628c82b6a92876f))

# [1.0.0-alpha.22](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.21...v1.0.0-alpha.22) (2023-07-23)

### Features

- Add options.delay and defaultDelay ([52aa114](https://github.com/pioneer32/smocks/commit/52aa11456cf6955f57d938d1e971c4bd3070d4c4))

# [1.0.0-alpha.21](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.20...v1.0.0-alpha.21) (2023-07-20)

### Features

- defaultCollection can now be passed into Smocks server with options ([e0adae4](https://github.com/pioneer32/smocks/commit/e0adae40c4e833b07342c83f0a5b3b7a306b4a7d))

# [1.0.0-alpha.20](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.19...v1.0.0-alpha.20) (2023-07-19)

### Features

- Default CORS is to allow any header ([ed5123b](https://github.com/pioneer32/smocks/commit/ed5123b57f325aa610aeaf5abc1ef3bfc723740c))

# [1.0.0-alpha.19](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.18...v1.0.0-alpha.19) (2023-07-04)

### Features

- Add -c/--config CLI parameter, so that the same options can be passed inside SmocksServer via CLI ([8acf349](https://github.com/pioneer32/smocks/commit/8acf349f5dd1b53089733296d21d60a9e9f5dfd2))

# [1.0.0-alpha.18](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.17...v1.0.0-alpha.18) (2023-07-04)

### Features

- Add cors option to enable/disable sending CORS headers automatically. Default is TRUE. ([f2d34c0](https://github.com/pioneer32/smocks/commit/f2d34c0398543feb55fe56b02f2c35a265a85e6b))

# [1.0.0-alpha.17](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.16...v1.0.0-alpha.17) (2023-07-03)

### Bug Fixes

- ts-import cache location is now always inside project-root ([8c92dbb](https://github.com/pioneer32/smocks/commit/8c92dbb614803f8cb394eb7f1a05ed314e40c5cb))

# [1.0.0-alpha.16](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.15...v1.0.0-alpha.16) (2023-07-03)

### Bug Fixes

- cli crashes ([3a80283](https://github.com/pioneer32/smocks/commit/3a8028340104c22ea258b1968a1b43a6635c0368))

# [1.0.0-alpha.15](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.14...v1.0.0-alpha.15) (2023-07-03)

### Bug Fixes

- cli now accepts projectRoot option ([0e0ee0b](https://github.com/pioneer32/smocks/commit/0e0ee0b3a652a611996c751b8ad734ac896837d2))

# [1.0.0-alpha.14](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.13...v1.0.0-alpha.14) (2023-07-02)

**Note:** Version bump only for package @pioneer32/smocks

# [1.0.0-alpha.13](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.12...v1.0.0-alpha.13) (2023-06-29)

### Bug Fixes

- trying to fix esm/cjs import/require issues ([2a4fb12](https://github.com/pioneer32/smocks/commit/2a4fb12089608c32f9451095375c0e10b3c2a2ee))

# [1.0.0-alpha.12](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.11...v1.0.0-alpha.12) (2023-06-29)

**Note:** Version bump only for package @pioneer32/smocks

# [1.0.0-alpha.11](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.10...v1.0.0-alpha.11) (2023-06-29)

**Note:** Version bump only for package @pioneer32/smocks

# [1.0.0-alpha.10](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.9...v1.0.0-alpha.10) (2023-06-29)

**Note:** Version bump only for package @pioneer32/smocks

# [1.0.0-alpha.9](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.8...v1.0.0-alpha.9) (2023-06-29)

**Note:** Version bump only for package @pioneer32/smocks

# [1.0.0-alpha.8](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.7...v1.0.0-alpha.8) (2023-06-29)

**Note:** Version bump only for package @pioneer32/smocks

# [1.0.0-alpha.7](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.6...v1.0.0-alpha.7) (2023-06-29)

### Bug Fixes

- ERR_REQUIRE_ESM when use "smocks start" ([a6f8e19](https://github.com/pioneer32/smocks/commit/a6f8e190a65db511d9dbd471bce6c356ec16637c))

# [1.0.0-alpha.6](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.5...v1.0.0-alpha.6) (2023-06-29)

**Note:** Version bump only for package @pioneer32/smocks

# [1.0.0-alpha.5](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.4...v1.0.0-alpha.5) (2023-06-28)

**Note:** Version bump only for package @pioneer32/smocks

# [1.0.0-alpha.4](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.3...v1.0.0-alpha.4) (2023-06-23)

**Note:** Version bump only for package @pioneer32/smocks

# [1.0.0-alpha.3](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) (2023-06-23)

### Bug Fixes

- shebang is to stay ([365e942](https://github.com/pioneer32/smocks/commit/365e9425d81572a21dd13fb4574f1bb409b53068))

# [1.0.0-alpha.2](https://github.com/pioneer32/smocks/compare/v1.0.0-alpha.0...v1.0.0-alpha.2) (2023-06-23)

### Features

- Add Conventional commits ([3d69f09](https://github.com/pioneer32/smocks/commit/3d69f09484124a0fe0948a5780d42d28e8984540))
