interface Window {
  readonly electronTRPC: {
    rpc: (
      op: import("./index").IPCRequestOptions
    ) => Promise<import("./index").IPCResponse>;
  };
}
