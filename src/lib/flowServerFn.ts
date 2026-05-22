import { createServerFn } from "@tanstack/react-start";
import type { ConversationFlow } from "./flowTypes";
import { readFlowsFromDisk, writeFlowsToDisk } from "./flowStore";

export const loadFlowsFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<ConversationFlow[]> => readFlowsFromDisk());

export const saveFlowsFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as ConversationFlow[])
  .handler(async ({ data }: { data: ConversationFlow[] }): Promise<{ ok: boolean }> => {
    writeFlowsToDisk(data);
    return { ok: true };
  });
