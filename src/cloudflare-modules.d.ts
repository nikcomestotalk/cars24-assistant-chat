/**
 * Workers virtual modules (resolved when building / running inside workerd via @cloudflare/vite-plugin).
 * See: https://developers.cloudflare.com/workers/runtime-apis/bindings/#importing-env
 */
declare module "cloudflare:workers" {
  export const env: {
    /** From `wrangler` vars / `.dev.vars` / dashboard secrets — string in local dev. */
    ANTHROPIC_API_KEY?: string;
    CARS24_API_KEY?: string;
    [key: string]: unknown;
  };
}
