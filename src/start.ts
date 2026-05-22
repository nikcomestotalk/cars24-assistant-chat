import { createStart } from "@tanstack/react-start";

// TanStack Start requires a callback that returns configuration options
// The callback is called to get the StartInstanceOptions
export const startInstance = createStart(() => ({}));
