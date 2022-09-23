import { useState } from "react";
import "./App.css";
import { trpc } from "./utils/trpc";
import Home from "./Home";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Operation, TRPCClientError, TRPCClientRuntime } from "@trpc/client";
import type { TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import { AnyRouter, inferRouterError } from "@trpc/server";
import {
  TRPCResponse,
  TRPCResponseMessage,
  TRPCResultMessage,
} from "@trpc/server/rpc";

export function transformResult<TRouter extends AnyRouter, TOutput>(
  response:
    | TRPCResponseMessage<TOutput, inferRouterError<TRouter>>
    | TRPCResponse<TOutput, inferRouterError<TRouter>>,
  runtime: TRPCClientRuntime
) {
  if ("error" in response) {
    const error = runtime.transformer.deserialize(
      response.error
    ) as inferRouterError<TRouter>;
    return {
      ok: false,
      error: {
        ...response,
        error,
      },
    } as const;
  }

  const result = {
    ...response.result,
    ...((!response.result.type || response.result.type === "data") && {
      type: "data",
      data: runtime.transformer.deserialize(response.result.data),
    }),
  } as TRPCResultMessage<TOutput>["result"];
  return { ok: true, result } as const;
}

interface IPCResult {
  response: TRPCResponse;
}

// export type HTTPRequestOptions = ResolvedHTTPLinkOptions &
//   GetInputOptions & {
//     type: ProcedureType;
//     path: string;
//   };

export type IPCRequestOptions = Operation;

export function ipcLink<TRouter extends AnyRouter>(): TRPCLink<TRouter> {
  return (runtime) =>
    ({ op }) => {
      return observable((observer) => {
        const promise: Promise<IPCResult> = (window as any).electronTRPC.rpc(
          op
        );

        promise
          .then((res) => {
            const transformed = transformResult(res.response, runtime);

            if (!transformed.ok) {
              observer.error(TRPCClientError.from(transformed.error));
              return;
            }
            observer.next({
              result: transformed.result,
            });
            observer.complete();
          })
          .catch((cause: Error) => observer.error(TRPCClientError.from(cause)));

        return () => {
          // cancel promise here
        };
      });
    };
}

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => {
    return trpc.createClient({
      links: [ipcLink()],
    });
  });

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Home />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;
