# Aevum

[![Travis](https://img.shields.io/travis/prefixaut/aevum.svg?style=for-the-badge)](https://travis-ci.org/prefixaut/aevum)
[![npm Version](https://img.shields.io/npm/v/aevum.svg?style=for-the-badge)](https://www.npmjs.com/package/aevum)
[![npm bundle size (minified)](https://img.shields.io/bundlephobia/min/aevum.svg?style=for-the-badge)](https://www.npmjs.com/package/aevum)
[![Maintainability](https://img.shields.io/codeclimate/maintainability-percentage/prefixaut/aevum.svg?style=for-the-badge)](https://codeclimate.com/github/prefixaut/aevum)
[![Test Coverage](https://img.shields.io/codeclimate/coverage/prefixaut/aevum.svg?style=for-the-badge)](https://codeclimate.com/github/prefixaut/aevum)
[![npm License](https://img.shields.io/npm/l/aevum.svg?style=for-the-badge)](https://spdx.org/licenses/MIT.html)

---

Aevum is a highly customizable and lightweight timer formatter, aimed to be used in high-performance applications. Therefore it's optimized in speed but still letting you tune everything you need to do.

It does not have any runtime dependencies and can be used in any modern JavaScript environment.

---

## Installation

```sh
yarn add aevum
npm install aevum
```

## Usage

```javascript
// ES6 Import
import { Aevum } from 'aevum';

// CommonJS Module
const Aevum = require('aevum').Aevum;

const instance = new Aevum('My timer says: (h:[h]:)(m:[m]:)(s:[s].)(ddd)');

instance.format(1234); // "My timer says: 1.234"
```

## Documentation

A more detailed documentation about the installation process, how to build the library as well as as a in-depth description about the usage can be found in the [Documentation](https://docs.prefix.moe/aevum)