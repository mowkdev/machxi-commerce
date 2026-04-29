---
name: SDK Hardening
overview: "Fix the SDK implementation issues from highest severity downward: make the Zod/codegen story explicit and correct, protect OpenAPI exposure, harden Kubb generation, align package boundaries, and verify with regeneration, type checks, tests, and a self-audit."
todos: []
isProject: false
---

# SDK Hardening Plan

## Scope
Address the SDK review findings in descending severity:

1. Zod generation/runtime mismatch in `[packages/admin-sdk/kubb.config.ts](packages/admin-sdk/kubb.config.ts)` and generated clients.
2. Unconditional OpenAPI spec exposure in `[apps/api/src/app.ts](apps/api/src/app.ts)` / `[apps/api/src/openapi/routes.ts](apps/api/src/openapi/routes.ts)`.
3. Missing Kubb collision detection in `[packages/admin-sdk/kubb.config.ts](packages/admin-sdk/kubb.config.ts)`.
4. Package boundary cleanup for React Query peer dependency in `[packages/admin-sdk/package.json](packages/admin-sdk/package.json)`.
5. Node engine/codegen compatibility in root `[package.json](package.json)`.

## Implementation Approach

### 1. Fix the Zod Strategy First
Decide by implementation evidence, not assumption:

- Try Kubb's recommended `parser: 'zod'` path in `pluginClient` so generated clients import generated schemas and parse successful responses.
- Regenerate the SDK and inspect representative generated clients, hooks, and zod files.
- If `parser: 'zod'` works cleanly with the custom runtime and envelope types, keep it.
- If it creates unacceptable generated output or runtime incompatibility, remove the unused runtime-validation claim and treat Zod output as exported/manual validators only. In that fallback, document it clearly in `[docs/sdk.md](docs/sdk.md)` and avoid pretending responses are validated automatically.

Primary target:

```ts
pluginClient({
  output: { path: './client' },
  importPath: '../../runtime',
  dataReturnType: 'data',
  parser: 'zod',
})
```

### 2. Gate OpenAPI Exposure
Make the code match the existing comment in `[apps/api/src/openapi/routes.ts](apps/api/src/openapi/routes.ts)`:

- Add/use an environment flag such as `OPENAPI_DOCS_ENABLED`.
- Only call `mountOpenAPI(app)` when the flag is explicitly enabled.
- Keep `pnpm openapi:emit` unaffected, because SDK generation uses `createApp()` plus `generateSpecs()` directly and should not require serving `/openapi.json`.
- Add or update env typing/default handling if this repo centralizes env parsing.

### 3. Harden Kubb Generation
Update `[packages/admin-sdk/kubb.config.ts](packages/admin-sdk/kubb.config.ts)`:

- Add `collisionDetection: true` to `pluginOas` while keeping `validate: true`.
- Regenerate and confirm no naming collisions appear.
- Keep explicit route `operationId`s as the primary naming control.

### 4. Clean Package Boundaries
Adjust `[packages/admin-sdk/package.json](packages/admin-sdk/package.json)` conservatively:

- Move `@tanstack/react-query` from `dependencies` to `peerDependencies`, with a matching `devDependency` so the SDK package can type-check itself.
- Keep `react` as peer/dev dependency.
- Keep `axios` as a dependency because the SDK runtime owns the axios client.
- Keep `zod` as a dependency if generated runtime parsing uses it; otherwise consider whether it should remain a dependency due to exported zod schemas.

### 5. Align Node Engine With Tooling
Update root `[package.json](package.json)` if Kubb generation requires Node 20+ in practice:

- Prefer `