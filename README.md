# Aevum

[![Travis](https://img.shields.io/travis/prefixaut/aevum.svg?style=flat-square)](https://travis-ci.org/prefixaut/aevum)
[![npm Version](https://img.shields.io/npm/v/aevum.svg?style=flat-square)](https://www.npmjs.com/package/aevum)
[![Test Coverage](https://api.codeclimate.com/v1/badges/32437a5db5abfc7b21e8/test_coverage)](https://codeclimate.com/github/prefixaut/aevum/test_coverage)
[![npm License](https://img.shields.io/npm/l/aevum.svg?style=flat-square)](https://spdx.org/licenses/MIT.html)

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