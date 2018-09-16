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

Examples:
- `[h]`
- `[ss]`
- `[ddd]`

### Optional Format-Blocks

Optional Format-Blocks are like regular format-blocks, except that they only
get rendered when the value exists.

The Optional Format-Block is defined nearly the same as a regular format-block.
The difference is however that it's wrapped between regular brackets: `(`/`)`
instead with squared brackets.

Additionally, it allows you to specify what content will be rendered when the
value exists.
This is useful when you want to display seperators or other content only when
a certain value exists.

The content which should be rendered defaults to the specified type. It can be
changed however by adding a colon (`:`) after the type.

What makes the content really powerful, is that you're able to put in string-
content and other format-blocks.

To not make it a hassle to repeat the already typed type from the beginning,
every `#` character is syntactic sugar to replace it with a format-block of
the optional type.

Examples:
- `(h)`
- `(m:foo bar)`
- `(s:[ss]s)`
- `(d:#ms)` -> `(d:[d]ms)`

::: warning NOTE
It's not possible to stack optional format-blocks into other ones.
Use multiple defintions instead.
:::

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
