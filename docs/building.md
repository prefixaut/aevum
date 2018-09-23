# Building

Since aevum is written in [TypeScript](https://www.typescriptlang.org),
you have to compile it to JavaScript using the TypeScript CLI.

To set everything up, you should use a package-manager like
[yarn](https://yarnpkg.com) or [npm](https://npmjs.org) and install the
required dev-dependencies.

```sh
yarn install
npm install
```

This will install TypeScript and some other stuff for you. You can then use
the project settings to build aevum yourself:

```sh
yarn build
npm run build
```

This will compile aevum as a CommonJS-Module into the `dist` directory.
To customize the build-process, either call the TypeScript CLI own your own
or edit the **_build_**-script in the `package.json` file for a more permanent
solution.

For a full documentation of the TypeScript settings, please see the
[TypeScript Documentation](https://www.typescriptlang.org/docs/home.html).
