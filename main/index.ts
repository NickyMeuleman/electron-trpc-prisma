import { app, ipcMain } from "electron";
import type { IpcMain } from "electron";
import "./security-restrictions";
import { restoreOrCreateWindow } from "./mainWindow";
import { callProcedure, TRPCError } from "@trpc/server";
import type {
  AnyRouter,
  inferRouterContext,
  inferRouterError,
} from "@trpc/server";
import type { TRPCResponse, TRPCResponseMessage } from "@trpc/server/rpc";
import { createContext } from "../api/context";
import { appRouter } from "../api/router";
import type { IPCRequestOptions, IPCResponse } from "../types";

/**
 * Prevent electron from running multiple instances.
 */
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}
app.on("second-instance", () => {
  restoreOrCreateWindow().catch((err) => {
    throw err;
  });
});

/**
 * Disable Hardware Acceleration to save more system resources.
 */
app.disableHardwareAcceleration();

/**
 * Shout down background process if all windows was closed
 */
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

/**
 * @see https://www.electronjs.org/docs/latest/api/app#event-activate-macos Event: 'activate'.
 */
app.on("activate", () => {
  restoreOrCreateWindow().catch((err) => {
    throw err;
  });
});

/**
 * Create the application window when the background process is ready.
 */
app
  .whenReady()
  .then(async () => {
    await restoreOrCreateWindow().catch((err) => {
      throw err;
    });
  })
  .catch((e) => console.error("Failed create window:", e));

/**
 * Install Vue.js or any other extension in development mode only.
 * Note: You must install `electron-devtools-installer` manually
 */
// if (import.meta.env.DEV) {
//   app.whenReady()
//     .then(() => import('electron-devtools-installer'))
//     .then(({default: installExtension, VUEJS3_DEVTOOLS}) => installExtension(VUEJS3_DEVTOOLS, {
//       loadExtensionOptions: {
//         allowFileAccess: true,
//       },
//     }))
//     .catch(e => console.error('Failed install extension:', e));
// }

/**
 * Check for new version of the application - production mode only.
 */
// if (import.meta.env.PROD) {
//   app
//     .whenReady()
//     .then(() => import("electron-updater"))
//     .then(({ autoUpdater }) => autoUpdater.checkForUpdatesAndNotify())
//     .catch((e) => console.error("Failed check updates:", e));
// }

// from @trpc/server/src/internals/transformTRPCResonse
function transformTRPCResponseItem<
  TResponseItem extends TRPCResponse | TRPCResponseMessage
>(router: AnyRouter, item: TResponseItem): TResponseItem {
  // explicitly use appRouter instead of router argument: https://github.com/trpc/trpc/issues/2804
  if ("error" in item) {
    return {
      ...item,
      error: appRouter._def.transformer.output.serialize(item.error),
    };
  }

  if ("data" in item.result) {
    return {
      ...item,
      result: {
        ...item.result,
        data: appRouter._def.transformer.output.serialize(item.result.data),
      },
    };
  }

  return item;
}

// from @trpc/server/src/error/utils
function getMessageFromUnkownError(err: unknown, fallback: string): string {
  if (typeof err === "string") {
    return err;
  }

  if (err instanceof Error && typeof err.message === "string") {
    return err.message;
  }
  return fallback;
}

// from @trpc/server/src/error/utils
function getErrorFromUnknown(cause: unknown): Error {
  if (cause instanceof Error) {
    return cause;
  }
  const message = getMessageFromUnkownError(cause, "Unknown error");
  return new Error(message);
}

// from @trpc/server/src/error/utils
function getTRPCErrorFromUnknown(cause: unknown): TRPCError {
  const error = getErrorFromUnknown(cause);
  // this should ideally be an `instanceof TRPCError` but for some reason that isn't working
  // ref https://github.com/trpc/trpc/issues/331
  if (error.name === "TRPCError") {
    return cause as TRPCError;
  }

  const trpcError = new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    cause: error,
    message: error.message,
  });

  // Inherit stack from error
  trpcError.stack = error.stack;

  return trpcError;
}

export function createIPCHandler({ ipcMain }: { ipcMain: IpcMain }) {
  ipcMain.handle(
    "electron-trpc",
    (_event: Electron.IpcMainInvokeEvent, opts: IPCRequestOptions) => {
      return resolveIPCResponse(opts);
    }
  );
}

// includes error handling, type info gets lost at helper function calls
async function resolveIPCResponse<TRouter extends AnyRouter>(
  opts: IPCRequestOptions
): Promise<IPCResponse> {
  const { type, input: serializedInput } = opts;
  const { transformer } = appRouter._def;
  const deserializedInput = transformer.input.deserialize(serializedInput);

  type TRouterError = inferRouterError<TRouter>;
  type TRouterResponse = TRPCResponse<unknown, TRouterError>;

  const ctx = await createContext();

  if (type === "subscription") {
    throw new TRPCError({
      message: "Subscriptions should use wsLink",
      code: "METHOD_NOT_SUPPORTED",
    });
  }

  type RawResult =
    | { input: unknown; path: string; data: unknown }
    | { input: unknown; path: string; error: TRPCError };

  async function getRawResult(
    ctx: inferRouterContext<TRouter>
  ): Promise<RawResult> {
    const { path, type } = opts;
    const { procedures } = appRouter._def;

    try {
      const output = await callProcedure({
        ctx,
        path,
        procedures,
        rawInput: deserializedInput,
        type,
      });
      return {
        input: deserializedInput,
        path,
        data: output,
      };
    } catch (cause) {
      const error = getTRPCErrorFromUnknown(cause);
      return {
        input: deserializedInput,
        path,
        error,
      };
    }
  }

  function getResultEnvelope(rawResult: RawResult): TRouterResponse {
    const { path, input } = rawResult;

    if ("error" in rawResult) {
      return {
        error: appRouter.getErrorShape({
          error: rawResult.error,
          type,
          path,
          input,
          ctx,
        }),
      };
    } else {
      return {
        result: {
          data: rawResult.data,
        },
      };
    }
  }

  function getEndResponse(envelope: TRouterResponse): IPCResponse {
    const transformed = transformTRPCResponseItem(appRouter, envelope);

    return {
      response: transformed,
    };
  }

  try {
    const rawResult = await getRawResult(ctx);
    const resultEnvelope = getResultEnvelope(rawResult);

    return getEndResponse(resultEnvelope);
  } catch (cause) {
    const { input, path } = opts;
    // we get here if
    // - `createContext()` throws
    // - input deserialization fails
    const error = getTRPCErrorFromUnknown(cause);
    const resultEnvelope = getResultEnvelope({ input, path, error });

    return getEndResponse(resultEnvelope);
  }
}

// functional happy path, types get inferred
// async function resolveIPCResponse<TRouter extends AnyRouter>(
//   opts: IPCRequestOptions
// ): Promise<IPCResponse> {
//   const { path, type, input } = opts;
//   const { transformer, procedures } = appRouter._def;
//   const ctx = await createContext();
//   const rawInput = transformer.input.deserialize(input);
//   const output = await callProcedure({
//     ctx,
//     path,
//     procedures,
//     rawInput,
//     type,
//   });
//   const resultEnvelope = { result: { data: output } };
//   return {
//     response: transformTRPCResponseItem(appRouter, resultEnvelope),
//   };
// }

app.on("ready", () => {
  createIPCHandler({ ipcMain });
});
