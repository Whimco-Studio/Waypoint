## @rbxts/waypoint

Typed, runtime-validated RPC for Roblox (roblox-ts) with namespaces, batching, middleware, and `@rbxts/t` validation. Works without codegen: clients call by fully-qualified route names.

### Features
- **Namespaces**: hierarchical routes like `eggs.ping`, `eggs.math.add`
- **Runtime validation**: `@rbxts/t` on inputs/outputs
- **Batching**: multiple calls per Heartbeat coalesced into one RemoteEvent payload
- **Middleware**: auth, rate limit, logging
- **Manifest**: server broadcasts route manifest to clients on join

## Install

```bash
npm i @rbxts/waypoint @rbxts/t
```

## Layout

```
src/
  shared/types.ts
  shared/manifest.ts
  server/router.ts
  server/transport.ts
  server/middleware.ts
  client/client.ts
  client/batcher.ts
  index.ts
```

## Quick start

### Server
```ts
import { Router, Transport, t } from "@rbxts/waypoint";

const router = new Router("eggs");

router
  .route("ping", {
    in: t.nil,
    out: t.interface({ ok: t.boolean }),
    handler: async () => ({ ok: true }),
  })
  .ns("math", (r) => {
    r.route("add", {
      in: t.interface({ a: t.number, b: t.number }),
      out: t.number,
      handler: ({ params }) => params.a + params.b,
    });
  });

new Transport(router /*, [authMiddleware, rateLimitMiddleware]*/).start();
```

### Client
```ts
import { Client } from "@rbxts/waypoint";

const api = new Client();
await api.init();

// Direct by fully-qualified name
const pong = await api.call<{ ok: boolean }>("eggs.ping", undefined);
const sum  = await api.call<number>("eggs.math.add", { a: 2, b: 3 });

// Namespace sugar
const eggs = api.ns("eggs");
const pong2 = await eggs.call<{ ok: boolean }>("ping", undefined);
const sum2  = await eggs.call<number>("math.add", { a: 2, b: 3 });
```

## Concepts
- **Router**: register routes and nested namespaces. Each route defines `in`, `out`, and `handler`.
- **Transport**: sets up RemoteEvents, broadcasts manifest, handles batch requests and sends responses.
- **Batching**: calls within one Heartbeat are sent in a single payload and resolved per-id.
- **Validation**: `@rbxts/t` guards both request and response at runtime.
- **Manifest**: client can use to render/dev tooling; calls only require FQN strings.

## API

### Router
```ts
new Router(rootName?: string)
router.ns(name: string, builder: (r: Router) => void): Router
router.route<In, Out>(name: string, def: RouteDef<In, Out>): Router
```
- `RouteDef<In, Out>`
  - `in: Checker<In>` — `@rbxts/t` validator for inputs
  - `out: Checker<Out>` — `@rbxts/t` validator for outputs
  - `handler: (ctx) => Out | Promise<Out>` — your implementation

### Transport
```ts
new Transport(router: Router, middlewares?: Middleware[])
transport.start(): void
```
- Creates `Chisel/BatchReq`, `Chisel/BatchRes`, `Chisel/Manifest`
- Broadcasts manifest on `PlayerAdded`
- Processes batched requests; replies with individual results

### Client
```ts
const client = new Client()
await client.init()
await client.call<Out>(fqn: string, payload: unknown): Promise<Out>
const ns = client.ns("eggs")
await ns.call<Out>(name: string, payload: unknown)
```

## Errors
- `bad_request:<route>`: input failed validation
- `bad_response:<route>`: handler returned invalid output
- `route_not_found:<route>`: no route with that FQN
- `ns_not_found:<prefix>`: namespace not found during resolution

## Middleware
Simple rate-limit example:
```ts
import { Router, Transport } from "@rbxts/waypoint";

const rateLimit = (maxPerSec: number) => {
  const buckets = new Map<Player, { tokens: number; last: number }>();
  return async (ctx: { player: Player }, next: () => Promise<unknown>) => {
    const now = os.clock();
    const b = buckets.get(ctx.player) ?? { tokens: maxPerSec, last: now };
    const dt = now - b.last;
    b.tokens = math.min(maxPerSec, b.tokens + dt * maxPerSec);
    b.last = now;
    if (b.tokens < 1) throw "rate_limited";
    b.tokens -= 1;
    buckets.set(ctx.player, b);
    return next();
  };
};

const router = new Router("api");
new Transport(router, [rateLimit(20)]).start();
```

## Notes
- Import `@rbxts/t` as `import { t } from "@rbxts/t";`
- No codegen required — client uses fully-qualified route strings
- Compatible with roblox-ts 2.3+ and 3.x

## Scripts
- Build: `npm run build`
- Watch: `npm run watch`

## License
ISC
