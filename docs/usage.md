---
prev: /installation.md
---

# Usage

This is a short overview on how to use it.
First, import/require the package:

```javascript
// ES6 Import
import { Aevum } from 'aevum';

// CommonJS Module
const Aevum = require('aevum').Aevum;
```

Then create an instance with a formatting-string:

```javascript
const instance = new Aevum('My timer says: (h:[h]:)(m:[m]:)(s:[s].)(ddd)');
```

Finally let the created instance format your time:

```javascript
instance.format(1234); // "My timer says: 1.234"
```

::: warning
You should only create an instance once for a certain pattern, as the creation
of a new instance has to tokenize and optimize the provided format. This costs
a lot of time and may come with a performance penalty.
:::

## Format-String

The format-string is the part which is used to create a new instance.
It's the layout which describes what should be rendered for the final output.
Such a format-string is a combination of simple
[_string content_](#string-content), [ _format-blocks_](#format-blocks) and
[_optional format-blocks_](#optional-format-blocks).

### String Content

String content is simply everything inside of a format-string which can not
be identified as a _format-block_ nor as an _optional format-block_.
To escape special characters you can use the backslash `\`-character.

### Format-Blocks

A formatting-block describes a placeholder which will render a part of the
time. It's defined by wrapping the type inside square-brackets: `[`/`]`.
These blocks will always be rendered, no matter if the value is present or
not.

The type-name can be repeated to increase the length of the block.
This then effects how the final string is rendered in the end.
However, it may not exeed the maximal length of that type, as it would throw
a `SyntaxError` when trying to do so.
Read more in the [Formatting](#formatting)-Section.

```javascript
const instance1 = new Aevum('hello [m]');
instance1.format({ seconds: 12 }); // "hello 0"
instance1.format({ hours: 3 }); // "hello 0"
instance1.format({ minutes: 45 }); // "hello 45"
```

```javascript
const instance1 = new Aevum('hello [ddd]');
instance1.format({ seconds: 67 }); // "hello 000"
instance1.format({ minutes: 8 }); // "hello 000"
instance1.format({ milliseconds: 901 }); // "hello 901"
```

### Optional Format-Blocks

Optional Format-Blocks are like regular format-blocks, except that they only
get rendered when the value exists.

The Optional Format-Block is defined nearly the same as a regular format-block.
The difference is however that it's wrapped between regular brackets: `(`/`)`
instead with squared brackets.

```javascript
const instance = new Aevum('hello (h)');
instance.format({ milliseconds: 123 }); // "hello "
instance.format({ seconds: 45 }); // "hello "
instance.format({ minutes: 67 }); // "hello "
instance.format({ hours: 89 }); // "hello 89"
```

Additionally, it allows you to specify what content will be rendered when the
value exists.
This is useful when you want to display seperators or other content only when
a certain value exists.

The content which should be rendered defaults to the specified type. It can be
changed however by adding a colon (`:`) after the type.

What makes the content really powerful, is that you're able to put in string-
content and other format-blocks.

```javascript
const instance1 = new Aevum('hello (m:world!)');
instance.format({ milliseconds: 123 }); // "hello ";
instance.format({ seconds: 45 }); // "hello ";
instance.format({ minutes: 67 }); // "hello world!"
```

```javascript
const instance1 = new Aevum('hello (m:[m]:[s].[d])');
instance.format({ milliseconds: 123 }); // "hello ";
instance.format({ seconds: 45 }); // "hello ";
instance.format({ minutes: 67, seconds: 45, milliseconds: 123 }); // "hello 67:45.321"
```

To not make it a hassle to repeat the already typed type from the beginning,
every `#` character is syntactic sugar to replace it with a format-block of
the optional type.

```javascript
const instance1 = new Aevum('hello (m)');
instance1.format({ minutes: 12 }); // "hello 12"
```

```javascript
const instance2 = new Aevum('hello (m:[m]'));
instance2.format({ minutes: 34 }); // "hello 34"
```

```javascript
const instance3 = new Aevum('hello (m:#)');
instance3.format({ minutes: 56 }); // "hello 56"
```

::: tip TIP
You can also escape content in an optional format like you can in an a regular
string with the `\`-character.
Notice that you have to use `\\`, as i.e. a single `\#` would let javascript
try to escape it, which doesn't work as intended.
:::

```javascript
const instance = new Aevum('hello (s:world, i\'m the \\#1 in this place \\[d])');
instance.format({ seconds: 12 }); // "hello world, i'm the #1 in this place [d]"
```

::: danger WARNING
It's not possible to put optional format-blocks into other ones.
Use multiple defintions instead.
:::

```javascript
const instance = new Aevum('test(m:(h))'); // This throws a "SyntaxError"!

const instance = new Aevum('test(m)(h)'); // You may do it like this instead
```

## Types

### Basic Time Types

| Type | Name         | Maximal Length |
| :--- | :----------- | :------------- |
| h    | Hours        | Unlimited      |
| m    | Minutes      | 2              |
| s    | Seconds      | 2              |
| d    | Milliseconds | 3              |


### Special Time Types

All special types have a maximal length of `1`.

| Type | Name         | Allowed in            | Description
| :--- | :----------- | :-------------------- | :----------
| +    | Positive     | Optional Format-Block | Rendered when the time is positive. Default output is a `+` character
| -    | Negative     | Optional Format-Block | Rendered when the time is negative. Default output is a `-` character
| ?    | Relative     | Format-Block          | Shorthand for `+` and `-`. Renders a `-` character when the time is negative, otherwise a `+` character

## Formatting

Formatting turns the previously defined format into a proper string again.
When formatting, you provide a time which is then getting rendered into the
format.

Example:

```javascript
const instance = new Aevum('foo [mm] bar');
instance.format(123456789); // "foo 17 bar"
instance.format({ minutes: 45 }); // "foo 45 bar"
```

As you can see, the `format`-Function accepts a timestamp (in milliseconds)
or a [`Time-Object`](#time-object). The timestamp is automatically getting
converted to a time object.

Additionally the function allows you to specify other
[Formatting Options](#formatting-options) which are getting passed in after the
time:

```javascript
instance.format(123456789, { strictFormat: false, padding: true });
```

### Time Object

A Time Object describes all parts of a time (duh) and how they should be
rendered. The TypeScript-Interface for it looks like this:

```typescript
interface Time {
    positive?: boolean;
    hours?: number; // >= 0
    minutes?: number; // >= 0 < 60
    seconds?: number; // >= 0 < 60
    milliseconds?: number; // >= 0 < 1000
}
```

### Formatting Options

```typescript
interface FormattingOptions {
    strictFormat?: boolean;
    padding?: boolean;
}
```

#### Strict-Format

The strict-format option is set to `false` on default. It controls if an
(optional-)format-block should expand the length when the value is longer than
specified in the format-string.

It'll cut away the content at the end of the part to limit the total length of
it.

Example:

```javascript
const instance1 = new Aevum('[d]');
instance1.format({ milliseconds: 1 }, { strictFormat: false }); // "1"
instance1.format({ milliseconds: 12 }, { strictFormat: false }); // "12"
instance1.format({ milliseconds: 123 }, { strictFormat: false }); // "123"

instance1.format({ milliseconds: 1 }, { strictFormat: true }); // "1"
instance1.format({ milliseconds: 12 }, { strictFormat: true }); // "1"
instance1.format({ milliseconds: 123 }, { strictFormat: true }); // "1"
```

```javascript
const instance2 = new Aevum('[dd]');
instance2.format({ milliseconds: 1 }, { strictFormat: false }); // "1"
instance2.format({ milliseconds: 12 }, { strictFormat: false }); // "12"
instance2.format({ milliseconds: 123 }, { strictFormat: false }); // "123"

instance2.format({ milliseconds: 1 }, { strictFormat: true }); // "01"
instance2.format({ milliseconds: 12 }, { strictFormat: true }); // "12"
instance2.format({ milliseconds: 123 }, { strictFormat: true }); // "12"
```

```javascript
const instance3 = new Aevum('[ddd]');
instance3.format({ milliseconds: 1 }, { strictFormat: false }); // "1"
instance3.format({ milliseconds: 12 }, { strictFormat: false }); // "12"
instance3.format({ milliseconds: 123 }, { strictFormat: false }); // "123"

instance3.format({ milliseconds: 1 }, { strictFormat: true }); // "001"
instance3.format({ milliseconds: 12 }, { strictFormat: true }); // "012"
instance3.format({ milliseconds: 123 }, { strictFormat: true }); // "123"
```

#### Padding

The padding option is set to `false` on default. It controls if time-types
below the highest type should be padded to the types max length.

Example:

```javascript
const instance = new Aevum('[h]:[m]:[s].[d]');
instance.format({ milliseconds: 123 }, { padding: false }); // "0:0:0.123"
instance.format({ seconds: 45 }, { padding: false }); // "0:0:45.0"
instance.format({ minutes: 67 }, { padding: false }); // "0:67:0.0"
instance.format({ hours: 89 }, { padding: false }); // "89:0:0.0"

instance.format({ milliseconds: 123 }, { padding: true }); // "0:0:0.123"
instance.format({ seconds: 45 }, { padding: true }); // "0:0:45.000"
instance.format({ minutes: 67 }, { padding: true }); // "0:67:00.000"
instance.format({ hours: 89 }, { padding: true }); // "89:00:00.000"
```