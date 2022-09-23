import { app, ipcMain } from "electron";
import type { IpcMain } from "electron";
import "./security-restrictions";
import { restoreOrCreateWindow } from "/@/mainWindow";
import { callProcedure, TRPCError } from "@trpc/server";
import type {
  AnyRouter,
  inferRouterContext,
  inferRouterError,
  ProcedureType,
} from "@trpc/server";
import type {
  TRPCResponse,
  TRPCResponseMessage,
  TRPCErrorResponse,
  TRPCResultResponse,
  TRPCSuccessResponse,
} from "@trpc/server/rpc";
import { createContext } from "../api/context";
import { appRouter } from "../api/router";
import { Operation } from "@trpc/client";

/**
 * Prevent electron from running multiple instances.
 */
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}
app.on("second-instance", restoreOrCreateWindow);

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
app.on("activate", restoreOrCreateWindow);

/**
 * Create the application window when the background process is ready.
 */
app
  .whenReady()
  .then(restoreOrCreateWindow)
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

function transformTRPCResponseItem<
  TResponseItem extends TRPCResponse | TRPCResponseMessage
>(router: AnyRouter, item: TResponseItem): TResponseItem {
  if ("error" in item) {
    return {
      ...item,
      error: router._def.transformer.output.serialize(item.error),
    };
  }

  if ("data" in item.result) {
    return {
      ...item,
      result: {
        ...item.result,
        data: router._def.transformer.output.serialize(item.result.data),
      },
    };
  }

  return item;
}

/**
 * Takes a unserialized `TRPCResponse` and serializes it with the router's transformers
 **/
export function transformTRPCResponse<
  TResponse extends
    | TRPCResponse
    | TRPCResponse[]
    | TRPCResponseMessage
    | TRPCResponseMessage[]
>(router: AnyRouter, itemOrItems: TResponse) {
  return Array.isArray(itemOrItems)
    ? itemOrItems.map((item) => transformTRPCResponseItem(router, item))
    : transformTRPCResponseItem(router, itemOrItems);
}

export function getMessageFromUnkownError(
  err: unknown,
  fallback: string
): string {
  if (typeof err === "string") {
    return err;
  }

  if (err instanceof Error && typeof err.message === "string") {
    return err.message;
  }
  return fallback;
}

export function getErrorFromUnknown(cause: unknown): Error {
  if (cause instanceof Error) {
    return cause;
  }
  const message = getMessageFromUnkownError(cause, "Unknown error");
  return new Error(message);
}

export function getTRPCErrorFromUnknown(cause: unknown): TRPCError {
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
export type IPCRequestOptions = Operation;

export function createIPCHandler({ ipcMain }: { ipcMain: IpcMain }) {
  ipcMain.handle(
    "electron-trpc",
    (_event: Electron.IpcMainInvokeEvent, opts: IPCRequestOptions) => {
      return resolveIPCResponse(opts);
    }
  );
}

interface IPCResult {
  response: TRPCResponse;
}

async function resolveIPCResponse<TRouter extends AnyRouter>(
  opts: IPCRequestOptions
): Promise<IPCResult> {
  const { type, input, path, id } = opts;

  type TRouterError = inferRouterError<TRouter>;
  type TRouterResponse = TRPCResponse<unknown, TRouterError>;

  let ctx: inferRouterContext<TRouter> | undefined = undefined;

  try {
    if (type === "subscription") {
      throw new TRPCError({
        message: `Unexpected operation ${type}`,
        code: "METHOD_NOT_SUPPORTED",
      });
    }

    ctx = await createContext();

    const deserializeInputValue = (rawValue: unknown) => {
      return typeof rawValue !== "undefined"
        ? appRouter._def.transformer.input.deserialize(rawValue)
        : rawValue;
    };

    const rawResults = await Promise.all(
      [path].map(async (path) => {
        try {
          const output = await callProcedure({
            procedures: appRouter._def.procedures,
            path,
            rawInput: input,
            ctx,
            type,
          });
          return {
            input,
            path,
            data: output,
          };
        } catch (cause) {
          const error = getTRPCErrorFromUnknown(cause);

          return {
            input,
            path,
            error,
          };
        }
      })
    );
    const errors = rawResults.flatMap((obj) => (obj.error ? [obj.error] : []));
    const resultEnvelopes = rawResults.map((obj): TRouterResponse => {
      const { path, input } = obj;

      if (obj.error) {
        return {
          error: appRouter.getErrorShape({
            error: obj.error,
            type,
            path,
            input,
            ctx,
          }),
        };
      } else {
        return {
          result: {
            data: obj.data,
          },
        };
      }
    });
    return {
      response: transformTRPCResponse(appRouter, resultEnvelopes[0]),
    };
  } catch (cause) {
    const error = getTRPCErrorFromUnknown(cause);
    if (error) {
      return {
        response: {
          error: appRouter.getErrorShape({
            error,
            type,
            path,
            input,
            ctx,
          }),
        },
      };
    }
  }
}

// WORKING FALLLLBACK
// async function resolveIPCResponse<TRouter extends AnyRouter>(
//   opts: IPCRequestOptions
// ): Promise<IPCResult> {
//   const { type, input, path, id } = opts;

//   type TRouterError = inferRouterError<TRouter>;
//   type TRouterResponse = TRPCResponse<unknown, TRouterError>;

//   let ctx: inferRouterContext<TRouter> | undefined = undefined;

//   let json: TRouterResponse;
//   try {
//     if (type === "subscription") {
//       throw new TRPCError({
//         message: `Unexpected operation ${type}`,
//         code: "METHOD_NOT_SUPPORTED",
//       });
//     }

//     ctx = await createContext?.();

//     const deserializeInputValue = (rawValue: unknown) => {
//       return typeof rawValue !== "undefined"
//         ? appRouter._def.transformer.input.deserialize(rawValue)
//         : rawValue;
//     };
//     //! tracked the transformer issue down to deserialize(input) returning undefined if superjson is used
//     // input doesn't arrive as serialized since it doesn't have the shape superjson serialized to (an object with json and meta fields)
//     // apparently superjson transformer isn't needed here because Set and Date work without it somehow
//     // later me: I forgot I wasn't doing web and the input doesn't go over HTTP, maybe the stuff I use superjson for on the web isn't needed here

//     const output = await callProcedure({
//       ctx,
//       path,
//       type,
//       rawInput: input,
//       input: deserializeInputValue(input),
//       procedures: appRouter._def.procedures,
//     });

//     json = {
//       id: null,
//       result: {
//         type: "data",
//         data: output,
//       },
//     };
//   } catch (cause) {
//     const error = getTRPCErrorFromUnknown(cause);

//     json = {
//       id: null,
//       error: appRouter.getErrorShape({
//         error,
//         type,
//         path,
//         input,
//         ctx,
//       }),
//     };
//   }

//   return {
//     response: transformTRPCResponse(appRouter, json),
//   };
// }

app.on("ready", () => {
  createIPCHandler({ ipcMain });
});
