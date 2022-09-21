Based on: https://github.com/cawa-93/vite-electron-builder
The tRPC over IPC code is based on [the electron-trpc package](https://github.com/jsonnull/electron-trpc), adapted to support tRPC v10 by using [tRPC source](https://github.com/trpc/trpc/tree/next).

## Running locally

- Run `npm run bootstrap`.
  This installs the dependencies and sets up the database.

- Run `npm run dev`
  This starts a development watch process using `vite`.
  It hot reloads on changes to `renderer/`
  It reloads the web page on changes to `preload/`
  It fully reloads the Electron app on changes to `main/`

## Packaging the app

`electron-builder` is used to compile this codebase into an executable.

- Run `npm run compile`
  Change the `--windows` flag to the wanted OS.
  Leaving off the `--dir` flag means it compiles an installable executable.

[`electron-builder` CLI docs](https://www.electron.build/cli)

## Notes

The `resolve.alias` stuff in `vite.config.ts` files is needed because https://github.com/vitejs/vite/issues/6828
