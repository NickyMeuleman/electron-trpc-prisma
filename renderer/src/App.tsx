import { useState } from "react";
import "./App.css";
import { trpc } from "./utils/trpc";
import Home from "./Home";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
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
  runtime: any
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

export function ipcLink<TRouter extends AnyRouter>(
  opts?: any
): TRPCLink<TRouter> {
  return (runtime) =>
    ({ op }) => {
      return observable((observer) => {
        const promise = (window as any).electronTRPC.rpc(op);

        promise
          .then((res: any) => {
            const transformed = transformResult(res, runtime);

            if (!transformed.ok) {
              observer.error(
                TRPCClientError.from(transformed.error, {
                  meta: res.meta,
                })
              );
              return;
            }
            observer.next({
              context: res.meta,
              result: transformed.result,
            });
            observer.complete();
          })
          .catch((cause: any) => observer.error(TRPCClientError.from(cause)));

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
