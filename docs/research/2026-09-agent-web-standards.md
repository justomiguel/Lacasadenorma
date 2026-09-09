# Agent-Facing Web Standards Reference — as of 9 September 2026

Scope: WebMCP, MCP, llms.txt, AEO/GEO, and Schema.org for a nonprofit donation/transparency site.
Every claim below is dated and sourced. Where the brief's premises were out of date, that is called out explicitly.

---

## 0. Corrections to the brief's premises (read this first)

The task description contained five assumptions that are no longer true. They matter because building to them would produce non-functional code.

| Premise in the brief | Reality as of Sept 2026 | Source |
|---|---|---|
| `navigator.modelContext.provideContext({ tools: [...] })` | **Removed.** Entry point is `document.modelContext`; registration is `registerTool()` one tool at a time. `provideContext()` / `clearContext()` / `unregisterTool()` are gone. | [webmcp#101](https://github.com/webmachinelearning/webmcp/issues/101) closed via PR #132; [Chromium CL 4a9fee9](https://github.com/chromium/chromium/commit/4a9fee9eafcabd675c7245cc1b0acc1ca5f17d99) "WebMCP: Remove navigator.modelContext"; [Chrome docs](https://developer.chrome.com/docs/ai/webmcp/imperative-api) (updated 2026-09-01) |
| Return shape `{ content: [{ type: "text", text }] }` | **That is MCP's shape, not WebMCP's.** WebMCP `execute` is `callback ToolExecuteCallback = Promise<any>`; the browser JSON-serializes whatever you return. Returning a plain string is idiomatic. | [WebMCP spec](https://webmachinelearning.github.io/webmcp/), Draft CG Report 4 Sept 2026, §4.2.1 + tool execute steps |
| `requestUserInteraction()` for human-in-the-loop | **Not in the current spec.** Removed alongside the `ModelContextClient` second argument to `execute`. A replacement (`requestUserInput`, modeled on MCP elicitation) is proposed but unlanded. Chrome's own security page still references it — that page is stale. | [webmcp#165](https://github.com/webmachinelearning/webmcp/issues/165), [PR #204](https://github.com/webmachinelearning/webmcp/pull/204); absent from the 4 Sept 2026 spec IDL |
| npm package `webmcp` as the polyfill | `webmcp` on npm is an abandoned stub (v0.0.1, published 2025-02-02, no repo). The real polyfill is **`@mcp-b/global`**; types are **`@mcp-b/webmcp-types`**. | npm registry, verified 2026-09-09 |
| `@modelcontextprotocol/sdk` is the current TS SDK | That's **v1 (legacy)**, now at 1.30.0. The current line is **v2**: `@modelcontextprotocol/server` / `@modelcontextprotocol/client`, both 2.0.0, implementing the 2026-07-28 spec. | [typescript-sdk README](https://github.com/modelcontextprotocol/typescript-sdk); npm, verified 2026-09-09 |

Two further items the brief didn't ask about but that invalidate common advice:

- **Google FAQ rich results were fully removed on 7 May 2026**, including the 2023 government/health carve-out. `FAQPage` is still valid markup, but there is no Google rich result to earn.
- **`WebSite` + `SearchAction`** (sitelinks searchbox) has been dead since 21 Nov 2024. `WebSite` itself is still supported, but only for the Site Names feature.

---

## 1. WebMCP

### 1.1 Specification status

| Dimension | Status | Date / source |
|---|---|---|
| Document | *WebMCP*, **Draft Community Group Report** | 4 September 2026 — https://webmachinelearning.github.io/webmcp/ |
| Venue | **W3C Web Machine Learning Community Group** (CG). Not a W3C Standard, not on the Recommendation track. | Spec "Status of this document" |
| Proposed WG uptake | [charter-drafts#829](https://github.com/w3c/charter-drafts/pull/829) proposes WebMCP as a **tentative deliverable** of the Web ML **Working Group**. Opened 2026-06-09, still open. | Tracked at [w3c/strategy#560](https://github.com/w3c/strategy/issues/560) |
| Apple / WebKit | **Formal position: oppose.** Concerns: API design, security, privacy, i18n, meaningful user consent, duplication, and venue. Apple states it will file a **formal objection** if the charter change merges. | [WebKit/standards-positions#670](https://github.com/WebKit/standards-positions/issues/670), closed 2026-06-17 as `oppose`; [marcoscaceres comment 2026-08-13](https://github.com/w3c/charter-drafts/pull/829) |
| Mozilla | Also filed; WebKit issue supersedes the older #649. No shipping signal. | ibid. |
| W3C TAG | [design-reviews#1238](https://github.com/w3ctag/design-reviews/issues/1238) — CG early review, **in progress**, flagged `Missing: Multi-stakeholder support`. Focus areas (API design, web architecture, security, privacy, a11y, i18n) all still `pending`. | Opened 2026-06-11 |
| Threat modeling | Two sessions held and **still in progress**: W3C Security IG 2026-07-07, Threat Modeling CG 2026-07-14. | Linked from w3c/strategy#560 |
| Driving orgs | Google + Microsoft (`@domfarolino`, `@bwalderman`) | design-reviews#1238 |

**Read:** this is a single-engine, contested proposal. Chromium is implementing; WebKit is opposed on architecture *and* venue; the TAG review has not delivered findings. The API has already had two breaking renames in 2026 (`provideContext` → `registerTool`, `navigator.` → `document.`). Treat it as unstable.

### 1.2 Browser support and flags

| Milestone | Chrome version | Note |
|---|---|---|
| DevTrial | **146** | Behind a flag |
| Origin Trial | **149 – 156 inclusive** | Desktop, Android, WebView. [Trial page](https://developer.chrome.com/origintrials/#/view_trial/4163014905550602241) |
| Proposed ship | **157** | Proposed, **not** guaranteed; no Intent to Ship as of 2026-09-09 |
| Web feature ID | `document-modelcontext` | [chromestatus 5117755740913664](https://chromestatus.com/feature/5117755740913664) |
| `navigator.modelContext` | Deprecated in **150**, subsequently removed | Chromium CL 4a9fee9 |
| Local testing flag | `chrome://flags/#enable-webmcp-testing` → Enabled, relaunch | [Chrome WebMCP overview](https://developer.chrome.com/docs/ai/webmcp) |
| Debugging | "Model Context Tool Inspector" extension | ibid. |

**Chrome stable on 2026-09-09 is 153.** Chrome moved to a **two-week release cycle starting with 153 on 8 Sept 2026** ([Chrome for Developers](https://developer.chrome.com/blog/chrome-two-week-release), [TechCrunch 2026-09-08](https://techcrunch.com/2026/09/08/chrome-is-now-shipping-updates-every-2-weeks-as-ai-changes-the-security-landscape/)). 154 lands 22 Sept. So M157 is roughly six weeks out, not "2027 territory" — but shipping is still a decision, not a schedule.

Other engines: **zero.** No Safari, no Firefox implementation or commitment.

**Real-world agent consumption is near zero.** Chrome's own trial is live and a few travel sites (Expedia, Booking.com) are piloting, but no mainstream consumer agent — not ChatGPT, not Claude, not Gemini-outside-Chrome — currently discovers WebMCP tools. Building WebMCP today buys future-readiness, not present traffic.

### 1.3 Gating requirements (all must hold, or the API is absent/throws)

1. **Secure context.** `[SecureContext]` on both the `Document.modelContext` attribute and the `ModelContext` interface. HTTPS only (localhost counts).
2. **`Window` only.** `[Exposed=Window]` — not available in workers.
3. **Origin-isolated documents only.** If the document opts *out* of origin isolation (`Origin-Agent-Cluster: ?0`, i.e. `document.domain` is enabled), **WebMCP APIs are disabled**. This is a Chrome-documented requirement and easy to trip accidentally via a legacy header.
4. **`tools` Permissions Policy.** Defaults to `self`: allowed in the top-level document and same-origin iframes, **disabled in cross-origin iframes**. Delegate with `<iframe src="https://example.com" allow="tools">`.
5. **Fully active document.** Otherwise `InvalidStateError`.

### 1.4 The API surface (verbatim from the 4 Sept 2026 IDL)

```webidl
partial interface Document {
  [SecureContext, SameObject] readonly attribute ModelContext modelContext;
};

[Exposed=Window, SecureContext]
interface ModelContext : EventTarget {
  Promise<undefined>                registerTool(ModelContextTool tool,
                                                 optional ModelContextRegisterToolOptions options = {});
  Promise<sequence<RegisteredTool>> getTools(optional ModelContextGetToolOptions options = {});
  Promise<DOMString>                executeTool(RegisteredTool tool,
                                                 optional object inputObject = {},
                                                 optional ModelContextExecuteToolOptions options = {});
  attribute EventHandler ontoolchange;
};

dictionary ModelContextTool {
  required DOMString          name;
  USVString                   title;          // for display in (possibly native) UI; localize it
  required DOMString          description;
  object                      inputSchema;    // JSON Schema 2020-12
  required ToolExecuteCallback execute;
  ToolAnnotations             annotations;
};

dictionary ToolAnnotations {
  boolean readOnlyHint          = false;
  boolean untrustedContentHint  = false;
  boolean consequentialHint     = false;
};

dictionary ToolExecuteCallbackOptions { required AbortSignal signal; };
callback ToolExecuteCallback = Promise<any> (object inputObject, ToolExecuteCallbackOptions options);

dictionary ModelContextRegisterToolOptions { sequence<USVString> exposedTo; AbortSignal signal; };
dictionary ModelContextGetToolOptions      { sequence<USVString> fromOrigins; };
dictionary ModelContextExecuteToolOptions  { AbortSignal signal; };
```

`RegisteredTool` (what `getTools()` hands back) additionally carries `origin`, `window`, and `title`.

**Hard constraints on `name`:** length 1–128, and only ASCII alphanumerics plus `_`, `-`, `.`. Anything else rejects with `InvalidStateError`.

### 1.5 Lifecycle

- **Register:** `await document.modelContext.registerTool(tool, { signal })`. Add-one semantics. Registering a **duplicate name throws** — this is deliberate, it's the anti-takeover guard that `provideContext()` was removed for bypassing.
- **Unregister:** there is **no `unregisterTool()`**. Pass an `AbortSignal` at registration and `controller.abort()`. Since **Chrome 153**, aborting unregisters *without* cancelling in-flight executions.
- **Cancellation inside `execute`:** the second argument is `{ signal }` — a distinct `AbortSignal` for that execution. Forward it to `fetch()` and long-running work.
- **Change notification:** `document.modelContext.addEventListener("toolchange", …)`.
- **Ephemerality:** tools exist only while the page is open. Close the tab, they're gone. This is the core architectural difference from an MCP server.

### 1.6 Return values and error handling

The `execute` callback returns `Promise<any>`. The browser then **serializes the resolved value to a JSON string** (`JSON.stringify` semantics) and hands that to the agent; `executeTool()` resolves to `Promise<DOMString>`.

Consequences worth designing around:

- Return a **string** for simple results, or a plain JSON-serializable object for structured ones. Do **not** hand-build `{ content: [{ type: "text", … }] }` — that's MCP wire format, and here it would just be serialized as a literal nested object.
- Non-serializable results (circular refs, values whose `toJSON` yields `undefined`) fail the execution.
- **Reject with descriptive text, not opaque errors.** Chrome's best-practices guidance: "Validate strictly in code, loosely in schema. Add descriptive errors to your function code to allow the model to self-correct and retry with new, valid parameters." The error string is model-facing prose, so write it that way.

Spec-defined rejections on `registerTool()`:

| Condition | Rejection |
|---|---|
| Document not fully active | `InvalidStateError` |
| Not allowed to use `tools` feature | `NotAllowedError` |
| Duplicate tool name | `InvalidStateError` |
| Empty `name` or `description` | `InvalidStateError` |
| `name` > 128 chars or illegal code point | `InvalidStateError` |
| `exposedTo` entry not a potentially-trustworthy origin | `SecurityError` |
| `inputSchema` not JSON-serializable | `TypeError` / rethrown |

On `executeTool()` the spec currently collapses most failures into `UnknownError` with editorial TODOs to refine (target not same-origin with expected origin, tool not found, tool not exposed to caller). Don't build logic on discriminating those.

### 1.7 Copy-pasteable progressive enhancement (no-op in unsupported browsers)

```js
/**
 * webmcp.js — registers WebMCP tools when the browser supports them.
 * Silent no-op everywhere else. Never let this file affect the human UI.
 */

/** Returns the ModelContext, or null if WebMCP is unavailable. */
function getModelContext() {
  if (typeof document === 'undefined') return null;
  if (!window.isSecureContext) return null;              // [SecureContext]
  // navigator.modelContext is the Chrome 149 origin-trial spelling; deprecated in 150.
  const ctx = document.modelContext ?? navigator.modelContext;
  return ctx && typeof ctx.registerTool === 'function' ? ctx : null;
}

/**
 * Registers tools. Resolves to an AbortController you can abort to unregister,
 * or null if WebMCP is unavailable. Never throws.
 */
export async function registerWebMcpTools(tools, { signal } = {}) {
  const ctx = getModelContext();
  if (!ctx) return null;

  const controller = new AbortController();
  if (signal) {
    if (signal.aborted) return null;
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  for (const tool of tools) {
    try {
      await ctx.registerTool(tool, { signal: controller.signal });
    } catch (err) {
      // Duplicate name, bad schema, policy-blocked, etc. Degrade silently:
      // a failed tool registration must never break the page for humans.
      if (import.meta.env?.DEV) console.warn(`[webmcp] ${tool.name} failed:`, err);
    }
  }
  return controller;
}
```

Usage, with a read-only tool shaped for a donation/transparency site:

```js
registerWebMcpTools([
  {
    name: 'get_campaign_totals',
    title: 'Campaign totals',
    description:
      'Returns the current fundraising total, the goal, the number of donations, ' +
      'and the date the figures were last reconciled. Use when asked how much has been raised.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false, consequentialHint: false },
    async execute(_input, { signal }) {
      const res = await fetch('/api/public/totals', { signal });
      if (!res.ok) return `Totals are unavailable right now (HTTP ${res.status}). Try again shortly.`;
      const t = await res.json();
      return `Raised ${t.raisedFormatted} of ${t.goalFormatted} from ${t.donationCount} donations. ` +
             `Figures reconciled ${t.reconciledAt}.`;
    },
  },
]);
```

**Notes on that example, deliberate:**
- `additionalProperties: false` on a no-parameter tool. Cheap, and it stops a confused model injecting junk.
- Errors are returned as *prose the model can act on*, not thrown.
- `readOnlyHint: true` lets agents skip a confirmation prompt.
- `signal` is threaded into `fetch`.
- Tool name is 19 chars, description is 190 — comfortably inside Chrome's budgets (§2.4).

### 1.8 TypeScript typing

**There is no official `@types/…` package, and `lib.dom.d.ts` does not declare `modelContext`** (verified against `microsoft/TypeScript-DOM-lib-generator` `main`, 2026-09-09). Three options, best first:

**(a) Hand-rolled ambient declaration — lowest risk, zero dependency.** Recommended for a small site.

```ts
// webmcp.d.ts
interface WebMcpToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
  consequentialHint?: boolean;
}

interface WebMcpTool<TArgs = Record<string, unknown>, TResult = unknown> {
  name: string;
  title?: string;
  description: string;
  inputSchema?: object;                       // JSON Schema 2020-12
  annotations?: WebMcpToolAnnotations;
  execute(input: TArgs, options: { signal: AbortSignal }): TResult | Promise<TResult>;
}

interface WebMcpRegisteredTool {
  name: string;
  title?: string;
  description: string;
  // string in Chrome 149-153; a parsed object from Chrome 154 (webmcp#241). Branch on typeof.
  inputSchema?: object | string;
  annotations?: WebMcpToolAnnotations;
  origin: string;
  window: Window;
}

interface WebMcpModelContext extends EventTarget {
  registerTool(tool: WebMcpTool<any, any>,
               options?: { signal?: AbortSignal; exposedTo?: string[] }): Promise<void>;
  getTools(options?: { fromOrigins?: string[] }): Promise<WebMcpRegisteredTool[]>;
  executeTool(tool: WebMcpRegisteredTool, inputArguments?: object,
              options?: { signal?: AbortSignal }): Promise<string | null>;
  ontoolchange: ((this: WebMcpModelContext, ev: Event) => unknown) | null;
}

interface Document  { readonly modelContext?: WebMcpModelContext }
interface Navigator { readonly modelContext?: WebMcpModelContext }  // deprecated, Chrome 149 only
```

Note `modelContext` is declared **optional** (`?`) so the compiler forces the feature check. The spec declares it non-optional; for progressive enhancement you want the opposite.

**(b) `@mcp-b/webmcp-types`** — v5.1.0, published 2026-08-31, from [WebMCP-org/npm-packages](https://github.com/WebMCP-org/npm-packages). Actively maintained, genuinely well-commented (it documents the Chrome-version schema-shape split inline). **But at 5.1.0 it lags the spec in two ways:** `WebMcpToolAnnotations` omits `consequentialHint`, and `execute` is typed single-argument `(input: TArgs)` — no `{ signal }`. It also pulls `@modelcontextprotocol/server` in as a type dependency. Use it if you want schema-to-argument type inference; patch or augment those two gaps.

**(c) `webmcp-types`** — v0.1.7, 2026-09-08, unaffiliated third party. Not vetted here. Prefer (a) or (b).

**Polyfill / runtime packages** (all `@mcp-b/*` at 5.1.0, published 2026-08-31, actively maintained monorepo):

| Package | What it is |
|---|---|
| `@mcp-b/global` | The WebMCP polyfill — makes `document.modelContext` exist |
| `@mcp-b/webmcp-polyfill` | Core runtime polyfill (dependency of the above) |
| `@mcp-b/webmcp-types` | Type definitions |
| `@mcp-b/transports` | Browser MCP transports (postMessage, extension messaging, iframe) |
| `@mcp-b/webmcp-ts-sdk` | WebMCP→MCP v2 browser adapter |
| `usewebmcp` | React hooks (v5.1.0); peer `react ^18 \|\| ^19` |
| `vue-webmcp`, `nuxt-webmcp` | Vue/Nuxt equivalents (third-party, lower version numbers) |

**Do not install a polyfill expecting agent reach.** Making `document.modelContext` exist in JS does not make any agent discover your tools — the discovery path is browser-mediated. The polyfill is useful for local development, tests, and the MCP-B extension bridge. Nothing more.

---

## 2. WebMCP security guidance — concrete rules

Sources: [WebMCP spec §6 Security and Privacy Considerations](https://webmachinelearning.github.io/webmcp/) (4 Sept 2026); [Chrome, *WebMCP tool security*](https://developer.chrome.com/docs/ai/webmcp/secure-tools) (pub. 2026-06-09, upd. 2026-09-01); [Chrome, *Agent security considerations for WebMCP*](https://developer.chrome.com/docs/agents/security) (2026-06-09); [Chrome, *WebMCP best practices*](https://developer.chrome.com/docs/ai/webmcp/best-practices) (2026-05-18).

### 2.1 The threat model in one paragraph

Agents inherit the user's identity, session, and cookies; they carry cross-site context; and LLMs cannot reliably distinguish instructions from data. The spec names three prompt-injection vectors: **metadata/description attacks** (tool poisoning — instructions hidden in your tool's `name`/`description`/parameter descriptions), **output injection** (instructions in what your tool *returns*, including user-generated content you're merely relaying), and **tools as attack targets** (your high-value tool becomes the thing a hijacked agent reaches for). The spec is blunt that WebMCP "does not inherently expand the attack surface" — the UI already exposed this — *but* that tool code paths and UI code paths may have different validation, and that divergence is the vulnerability.

### 2.2 Annotations — set all three, deliberately

| Annotation | Set `true` when | Effect |
|---|---|---|
| `readOnlyHint` | Tool only reads; no state mutation | Agent may skip confirmation prompts |
| `untrustedContentHint` | Output contains UGC, reviews, comments, or externally-sourced data | Signals the client to sanitize, spotlight, or suppress; the mitigation for output injection |
| `consequentialHint` | Significant, real-world, or non-reversible: payments, bookings, deletion | Lets the agent/browser enforce **mandatory user confirmation** before execution |

**For a donation site: any tool that initiates a payment must set `consequentialHint: true`.** This is the only human-in-the-loop mechanism currently in the spec — `requestUserInteraction()` is gone (§0). The honest framing is that `consequentialHint` is a *request* to the agent, not an enforcement primitive. **Your own UI must independently require an explicit human click before money moves.** Do not delegate that to an annotation.

### 2.3 The origin / permission model

- Tools are **private by default**: cross-origin documents can neither see nor execute them.
- `exposedTo: ['https://trusted.example']` in `registerTool` options opts specific **secure** origins in. Non-trustworthy origins → `SecurityError`.
- Symmetrically, a caller must *also* request the origin via `getTools({ fromOrigins: [...] })`. Both sides must opt in.
- Cross-origin iframe registration requires `allow="tools"` on the iframe (`tools` Permissions Policy, default `self`).
- Chrome's warning, quoted: *"Only expose your tools to origins that you trust. This is particularly important when tools manage user data or otherwise impact the user."* Even a read-only `getFavoriteProducts` leaks user information.
- **Chrome extensions with `host_permissions` can query and execute your tools via content scripts** — and could already run arbitrary JS on the page regardless. `exposedTo` is not a defense against extensions.

### 2.4 Character budgets (Chrome's published limits)

Exceeding these trips agent guardrails. They also shrink the injection surface — the spec explicitly frames size limits as an anti-injection measure ([webmcp#73](https://github.com/webmachinelearning/webmcp/issues/73)).

| Field | Budget |
|---|---|
| Tool description | 500 chars |
| Parameter description | 150 chars |
| Tool name / parameter name | 30 chars |
| Individual tool output | 1.5K chars |

### 2.5 Rules — do this

1. **Validate every input server-side, again.** `inputSchema` is a hint to the model, not a security boundary. The browser may validate for fast feedback; an attacker calls your endpoint directly.
2. **Reuse the exact same service layer as the human UI.** Divergent code paths between "button click" and "tool call" is the named vulnerability. One authorization check, one validation function, both callers.
3. **Make consequential handlers idempotent.** Use an idempotency key on donation confirmation so a retried tool call returns the existing receipt rather than charging twice.
4. **Treat tool output as data, never as authority.** If you relay donor messages, tribute notes, or any UGC, set `untrustedContentHint: true` and never let returned text influence what your application permits.
5. **Gate registration on auth state.** Register account-scoped tools only when signed in; abort the controller on logout.
6. **Return only what the user is already entitled to see.** No PII in tool responses that isn't already on their screen.
7. **Write descriptions in positive, literal language.** `"Creates a calendar event scheduled for a specific date and time."` Not `"Don't use this for weather."` Limitations should be implicit.
8. **Distinguish initiation from execution in the name.** `start_donation_checkout` (navigates to a form) vs `submit_donation` (charges). Ambiguous naming is listed in the spec under "accidental misalignment" as a route to unintended purchases.
9. **Keep normal defenses on.** Auth, authz, rate limits, audit logs, CSP. WebMCP sits on top of application security, not beside it.

### 2.6 Rules — don't do this

1. **Don't expose a tool that moves money without `consequentialHint: true` plus an independent UI confirmation step.**
2. **Don't expose admin, moderation, refund, payout, PII-export, or account-recovery functions as tools.** For a transparency site the safe rule: **read-only tools only, plus at most one navigational tool that takes the user to the donation form without submitting it.**
3. **Don't put instructions to the model in `description`.** Yours is the tool-poisoning vector; don't build the habit.
4. **Don't interpolate untrusted content into a description or a tool name, ever.**
5. **Don't use `exposedTo` to share anything user-scoped**, and don't add origins you don't operate.
6. **Don't disable origin isolation** (`Origin-Agent-Cluster: ?0`) — it silently kills WebMCP and weakens the origin boundary.
7. **Don't assume any agent honors your hints.** They are advisory signals to a probabilistic system.
8. **Don't ship a tool you haven't red-teamed with a hostile prompt.** Chrome recommends eval testing; the spec proposes shared injection eval datasets ([webmcp#106](https://github.com/webmachinelearning/webmcp/issues/106)) but none is normative yet.

### 2.7 Recommended tool surface for a donation/transparency site

| Tool | Annotations | Verdict |
|---|---|---|
| `get_campaign_totals` | `readOnlyHint: true` | Safe. Public data already on the page. |
| `get_fund_allocations` | `readOnlyHint: true` | Safe. Core transparency value. |
| `list_updates` | `readOnlyHint: true` | Safe. |
| `search_expenses` | `readOnlyHint: true` | Safe if the underlying ledger is already public. |
| `start_donation` (navigates to `/donate` with amount prefilled, does **not** submit) | `readOnlyHint: false`, `consequentialHint: false` | Acceptable. Human still clicks Give. |
| `submit_donation` / `process_payment` | — | **Don't ship.** No adequate HITL primitive exists in the spec today. |
| `get_donor_details`, `export_donors` | — | **Never.** |
| Anything relaying donor-written messages | `untrustedContentHint: true` | Only with the hint set. |

---

## 3. WebMCP ↔ MCP, and the server-side shape

### 3.1 Relationship

WebMCP is *MCP-inspired*, not MCP-over-JS. Per [Chrome's comparison](https://developer.chrome.com/docs/ai/webmcp/compare-mcp) (upd. 2026-05-19) and the spec's own note: **"this specification does not prescribe the format in which tools are exposed to the browser agent."** Browsers may surface tools via MCP, proprietary function-calling, or anything else. WebMCP deliberately omits server-side concepts such as **resources** and **prompts**.

| | MCP | WebMCP |
|---|---|---|
| Lifecycle | Persistent server/daemon | Ephemeral, tab-bound |
| Availability | Anywhere, anytime | Only while the user has your page open |
| Reach | Any MCP client | Browser agents only |
| Primitives | Tools, Resources, Prompts (+ extensions) | Tools only |
| Discovery | Client registration flows | Registered on page load |

The intended architecture is **both**: MCP as the platform-agnostic service layer, WebMCP as the in-page contextual layer.

### 3.2 MCP specification — current revision

**`2026-07-28`**, released 28 July 2026. It is the **largest revision since launch and is wire-incompatible in both directions with all prior versions.** ([Announcement](https://blog.modelcontextprotocol.io/posts/2026-07-28/); `LATEST_PROTOCOL_VERSION = "2026-07-28"` in `schema/2026-07-28/schema.ts`.)

What changed that affects architecture:

- **Stateless protocol core.** The `initialize` handshake and `Mcp-Session-Id` are **gone**. Each request carries its own protocol version, client info, and capabilities in `_meta` (`io.modelcontextprotocol/protocolVersion`, `…/clientInfo`, `…/clientCapabilities`). Requests are cacheable and routable like ordinary HTTP.
- **Header-based routing.** Streamable HTTP POSTs must carry `Mcp-Method` and `Mcp-Name`; servers reject header/body mismatches. Gateways and WAFs can route without parsing bodies.
- **Full JSON Schema 2020-12** for tool `inputSchema` / `outputSchema` (SEP-2106). Inputs keep the `type: "object"` root but gain `oneOf`/`anyOf`/`allOf`/`$ref`/`$defs`. Implementations **must not** auto-dereference external `$ref` URIs.
- **Multi Round-Trip Requests (MRTR)** replace server-initiated requests: the server returns `resultType: input_required` and the client retries carrying `inputResponses`.
- **Extensions framework** (opt-in, negotiated): `io.modelcontextprotocol/tasks`, Skills over MCP, MCP Apps.
- **Client ID Metadata Documents (CIMD)** replace OAuth Dynamic Client Registration (DCR deprecated, still functional).
- **Formal deprecation policy** — deprecated items keep working ≥ 12 months.

**Deprecated in 2026-07-28** (all with a ~12-month offramp): **Roots, Sampling, Logging** (SEP-2577), the **legacy HTTP+SSE transport**, DCR, and `includeContext` values `thisServer`/`allServers`.
**Removed outright:** `ping`, `logging/setLevel`, `notifications/roots/list_changed`, the standalone HTTP GET stream, SSE event IDs and `Last-Event-ID` resumption, `resources/subscribe`/`unsubscribe` (replaced by a single `subscriptions/listen` stream).

### 3.3 Transports

Two standard bindings ([spec](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)):

1. **stdio** — newline-delimited JSON-RPC over the standard streams of a client-launched subprocess. **Not deprecated.** Correct for local/desktop clients. Cancellation via `notifications/cancelled`.
2. **Streamable HTTP** — every message is an HTTP POST to a **single** MCP endpoint; the reply is either one JSON object or a **request-scoped** SSE stream. Cancellation by closing the response stream.

**Is SSE deprecated? Precisely:** the **legacy two-endpoint HTTP+SSE transport** from revision `2024-11-05` is deprecated (since `2025-03-26`, formally lifecycle-stated in `2026-07-28`). **Server-Sent Events as a mechanism is not deprecated** — Streamable HTTP still uses SSE for request-scoped streaming. What `2026-07-28` removed is the *standalone GET stream*, event IDs, and `Last-Event-ID` resumption.

Custom transports over a reliable bidirectional byte stream (Unix sockets, TCP) **should reuse stdio framing** rather than inventing one.

### 3.4 TypeScript SDK — packages and versions (verified npm, 2026-09-09)

| Package | Version | Published | Status |
|---|---|---|---|
| `@modelcontextprotocol/server` | **2.0.0** | 2026-07-27 | **Current (v2).** Implements 2026-07-28. |
| `@modelcontextprotocol/client` | **2.0.0** | 2026-07-27 | Current (v2). |
| `@modelcontextprotocol/core` | 2.0.0 | 2026-07-27 | Shared internals. |
| `@modelcontextprotocol/sdk` | 1.30.0 | 2026-07-27 | **Legacy v1.** Bug/security fixes ≥ 6 months post-v2. Branch `v1.x`. |
| `@modelcontextprotocol/node` \| `/express` \| `/fastify` \| `/hono` | — | — | Optional thin runtime adapters. |

v2 runs on Node, Bun, and Deno. Tool and prompt schemas use **[Standard Schema](https://standardschema.dev/)** — Zod v4, Valibot, ArkType, or anything compatible. (`@modelcontextprotocol/server@2.0.0` depends on `zod ^4.2.0`.)

**Caveat:** the repo is currently limiting PRs to one per new contributor "while v2 settles." Treat v2 as stable-but-young.

### 3.5 Server-side registration shape (for designing the adapter boundary)

```typescript
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

const server = new McpServer({ name: 'greeting-server', version: '1.0.0' });

server.registerTool(
  'greet',
  {
    description: 'Greet someone by name',
    inputSchema: z.object({ name: z.string() }),   // Standard Schema
  },
  async ({ name }) => ({
    content: [{ type: 'text', text: `Hello, ${name}!` }],   // <- MCP's shape, NOT WebMCP's
  }),
);

await server.connect(new StdioServerTransport());
```

Signature: `registerTool(name, { description, inputSchema, outputSchema?, annotations? }, handler)`. Resources and prompts follow the analogous `registerResource` / `registerPrompt` pattern; resources are a **server-only** concept with no WebMCP counterpart.

### 3.6 Designing the adapter boundary now, without implementing it

The two registration APIs differ in exactly three places. Isolate those three and the rest is shared.

| Concern | WebMCP | MCP v2 |
|---|---|---|
| Registration | `document.modelContext.registerTool(toolObject, { signal })` | `server.registerTool(name, config, handler)` |
| Schema format | Raw JSON Schema object | Standard Schema (Zod/Valibot/ArkType) |
| Return format | Any JSON-serializable value → serialized to a string | `{ content: [{ type: 'text', text }] }` |
| Lifecycle | AbortSignal, tab-bound | Process/connection-bound |
| Resources / prompts | Not supported | Supported |

The design that survives both: **write your application services as plain, transport-agnostic async functions with a Zod schema attached.** Something like:

```ts
// services/campaign.ts — knows nothing about MCP or WebMCP
export const getCampaignTotals = {
  name: 'get_campaign_totals',
  description: 'Returns current fundraising total, goal, donation count, and reconciliation date.',
  input: z.object({}),
  readOnly: true,
  consequential: false,
  async run(_input: {}, ctx: { signal?: AbortSignal }) {
    return { raised: …, goal: …, count: …, reconciledAt: … };
  },
};
```

Then two thin adapters you don't write yet:
- **WebMCP adapter:** `z.toJSONSchema(input)` → `inputSchema`; map `readOnly`/`consequential` → `annotations`; return `run()`'s value directly (or a formatted string).
- **MCP adapter:** pass `input` straight through as the Standard Schema; wrap `run()`'s value in `{ content: [{ type: 'text', text: JSON.stringify(...) }] }`.

Zod v4 ships `z.toJSONSchema()`, which makes the WebMCP direction nearly free. Keep every service pure and side-effect-scoped, and neither adapter needs to know the other exists.

---

## 4. llms.txt

### 4.1 Current standard

The de-facto spec is **[llmstxt.org](https://llmstxt.org/), now at v2** — the site itself is titled "The /llms.txt file, **v2**". Author: Jeremy Howard (Answer.AI). It is a **community proposal, not an IETF or W3C standard.**

**What changed in v2** (relative to the 2024 v1):
1. Added standard link relations for discoverability: `rel="alternate" type="text/markdown"` (the Markdown twin of a page) and `rel="describedby"` (the llms.txt covering it) — usable as HTML `<link>` or an HTTP `Link:` header.
2. Both Markdown-twin URL forms allowed: `page.html.md` **and** `page.md` (v1 allowed only the first).
3. Subpath semantics defined: a file covers URLs under its own path; where several apply, the most specific wins. So `/docs/llms.txt` is valid and covers `/docs/`.
4. Dropped the `llms_txt2ctx` context-expansion tool, which removed the mechanical meaning of the `Optional` section (it's now just "skippable under context pressure").

### 4.2 Exact format

Ordered sections, all Markdown:

1. Optional BOM.
2. **An H1 with the project/site name. This is the only required element.**
3. A **blockquote** with a short summary.
4. Zero or more Markdown blocks of any type **except headings** (details, caveats, how to interpret the files).
5. Zero or more **H2-delimited "file list" sections**, each a Markdown list of `- [Name](url): optional notes`.
6. By convention, an `## Optional` H2 holds secondary links an agent may skip.

The companion proposal: serve a clean Markdown version of each page at the same URL with `.md` appended or substituted (`index.md` for directory URLs).

### 4.3 `/llms-full.txt` — status

**Not part of the spec.** Neither v1 nor v2 defines it; the string does not appear in the llmstxt.org text. It is a separate community convention (popularized by docs platforms) that concatenates an entire corpus into one large Markdown file for single-fetch ingestion. The spec *does* mention `llms-ctx.txt` / `llms-ctx-full.txt`, but as **processing outputs** generated from an llms.txt, not as files you publish — and v2 dropped the tool that generated them.

Verdict: `llms-full.txt` is optional bulk-download infrastructure, complementary rather than alternative. It is the wrong thing to make enormous.

### 4.4 Does anything actually read it? (2026 evidence)

This is the question that should set your effort level, and the evidence converges.

| Study | Method | Finding |
|---|---|---|
| **Ahrefs**, *"We Analyzed 137K Sites: 97% of llms.txt Files Never Get Read"* | 137K sites | **97% attract no readers of any kind.** Perplexity's fetches were outnumbered by a chat app's link-preview bot. Googlebot's ~900 May fetches are ordinary URL discovery, not special interest. |
| **EZY Research** | 83 domains with server logs, 12 weeks | robots.txt vs llms.txt fetches — OpenAI/GPTBot family **3,990 vs 7**; ClaudeBot **3,120 vs 9**; PerplexityBot **775 vs 0**; Googlebot **5,125 vs 67**. Meta-ExternalAgent was the one crawler fetching llms.txt *more* than robots.txt. |
| **Limy** | 515,382,577 AI-bot traffic events, 90 days | Only **408** requests targeted llms.txt. "Statistically negligible." |
| **Search Atlas** | 13,911 domains × 83,387 LLM-visibility records across Copilot, Gemini, Google AI Mode, Grok, OpenAI, Perplexity | **llms.txt adoption does not predict citation behavior.** An apparent quality-dependent effect vanished once domain authority was controlled for. |
| **SE Ranking** | ~300,000 domains | No statistically significant correlation with AI citations; **removing llms.txt from the predictive model improved accuracy** — it was noise, not signal. |
| **AI Visibility Q3 2026** | 1,744 prominent domains | llms.txt adoption 7.0% (up from 4.9% in Q2). For comparison: robots.txt 50.2%, Schema.org 26.3%, ads.txt 16.1%. |

**Google is on the record against it.** Gary Illyes (July 2025) confirmed Google doesn't support llms.txt and isn't planning to; John Mueller compared it to the keywords meta tag. Google's own [AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) states plainly: *"You don't need to create new machine readable files, AI text files, markup, or Markdown to appear in Google Search (including its generative AI capabilities), as Google Search itself doesn't use them."*

**Where it does get read:** coding agents and IDEs (Cursor, Claude Code, Copilot) fetching documentation on demand. The AI labs publish llms.txt for their *own developer docs* (OpenAI, Anthropic, Gemini). Chrome's Lighthouse added an llms.txt check under experimental **Agentic Browsing** audits. Agents fetch it when **directed**, not speculatively — an unlinked file is unlikely to be picked up.

### 4.5 Recommendation and template

**Effort level: 30 minutes, once. Do not budget more.** The cost is near zero, downside risk is near zero, Meta already reads it, Lighthouse checks for it, and the agentic-browsing thesis is credible. But it will not get you cited in ChatGPT or Perplexity, and anyone claiming otherwise is ahead of the evidence. Do not build a pipeline, do not generate `.md` twins for every page, do not ship `llms-full.txt` unless someone asks. Spend that time on §5 instead.

Link it from your HTML so agents can discover it:

```html
<link rel="describedby" type="text/markdown" href="/llms.txt">
```

```markdown
# Example Memorial Fund

> A public-good fundraising campaign for [purpose], run by Example Foundation, a registered
> 501(c)(3). Every donation and disbursement is published on this site. Figures on this page
> are reconciled against bank records weekly.

All monetary figures are in USD and reflect the last reconciliation date shown on each page.
Financial statements are authoritative; page summaries are derived from them.
Questions about the campaign: contact@example.org

## About
- [About the campaign](https://example.org/about.md): Who we are, what the funds are for, and who administers them.
- [About the beneficiary](https://example.org/beneficiary.md): Biography and background of the person this campaign honors.
- [Governance](https://example.org/governance.md): Board, legal status, and oversight.

## Transparency
- [Where the money goes](https://example.org/transparency.md): Category breakdown of all funds disbursed to date.
- [Financial statements](https://example.org/financials.md): Reconciled statements, published quarterly.
- [Grants made](https://example.org/grants.md): Every grant, with recipient, amount, and date.

## Updates
- [Latest updates](https://example.org/updates.md): Reverse-chronological campaign news.

## Donate
- [How to donate](https://example.org/donate.md): Payment methods, fees, tax-deductibility, and receipts.

## Optional
- [Press coverage](https://example.org/press.md): External articles about the campaign.
- [FAQ](https://example.org/faq.md): Common questions.
```

---

## 5. AEO / GEO in 2026

### 5.1 What Google officially says

[*Guide to optimizing for generative AI features on Google Search*](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) and [*AI Features and Your Website*](https://developers.google.com/search/docs/appearance/ai-features), published via Search Central 15 May 2026:

- **"There are no additional requirements to appear in AI Overviews or AI Mode, nor other special optimizations necessary."**
- Eligibility as a supporting link = the page must be **indexed and eligible to appear in Google Search with a snippet.** That's the whole bar.
- Explicitly listed as things **not** to do: special AI files (llms.txt named directly), forced content chunking, AI-only writing, inauthentic mentions, **special schema for generative AI**.
- On structured data: *"Structured data isn't required for generative AI search, and there's no special schema.org markup you need to add. However, it's a good idea to continue using it as part of your overall SEO strategy, as it helps with being eligible for rich results."*
- **`robots.txt` for Googlebot is the control surface.** Google is explicit that AI is built into Search, so there is no separate AI-Overviews opt-out short of `nosnippet` / `data-nosnippet` / `max-snippet` / `noindex`.
- Measurement: Search Console gained a **Search Generative** performance report on 3 June 2026, covering AI Overviews, AI Mode, and generative features in Discover.

### 5.2 What the citation data shows

These are third-party measurements, not vendor guidance. Treat directionally.

- **Freshness is the strongest lever, and it's engine-specific.** Perplexity cites content updated within 30 days at an **82%** rate vs **37%** for content over a year old — a 45-point premium; content older than 60–90 days loses ground unless it keeps accruing citations. AirOps found **83%** of AI citations for commercial queries came from pages updated within 12 months, 60%+ within six. ChatGPT *Search* mode cites content **3.7× more recent** than conversational mode.
- **Engines are separate ecosystems.** Domain overlap between major engines runs **11–23%**. ChatGPT leans Wikipedia (47.9% of top citations) with ~7.9 sources per response and the most democratic distribution (Gini 0.164); Perplexity leans Reddit (46.7%) with ~21.9 sources and very high freshness sensitivity; Google AI Overviews leans YouTube (23.3%) plus the Knowledge Graph; Claude leans blogs (43.8%).
- **Perplexity favors institutional domains:** roughly **62%** of its citations come from `.edu` and `.org` (Authoritas). **This is a structural advantage for a nonprofit.**
- **Two citation mechanisms, two strategies.** Retrieval-augmented engines (Perplexity, ChatGPT Search, AI Mode) reward freshness, technical SEO, and information density. Training-based recall (ChatGPT conversational) rewards durable entity authority and consistency — you can't optimize that on a quarterly cycle.
- **Original data earns citations; borrowed data cites the original.** If you quote someone else's statistic, the model cites them. For a transparency site, your reconciled financial figures *are* original data. That is your single best citation asset.
- **Access is the failure mode nobody checks.** Blocking `OAI-SearchBot` in robots.txt removes you from ChatGPT search answers entirely, regardless of content quality. Sites block these accidentally, at the CDN as often as in robots.txt.

### 5.3 AI crawler user agents (verified 2026-09-09)

Split by **job**, because blocking one does not block the others.

| User-agent token | Operator | Job | Verification feed |
|---|---|---|---|
| `GPTBot` | OpenAI | **Training** | `openai.com/gptbot.json` |
| `OAI-SearchBot` | OpenAI | **Search index** — gates appearance in ChatGPT search answers | `openai.com/searchbot.json` |
| `ChatGPT-User` | OpenAI | User-triggered fetch | `openai.com/chatgpt-user.json` |
| `OAI-AdsBot` | OpenAI | Ad landing-page validation only | `openai.com/adsbot.json` |
| `ClaudeBot` | Anthropic | Training | `claude.com/crawling/bots.json` |
| `Claude-SearchBot` | Anthropic | Search index | ibid. |
| `Claude-User` | Anthropic | User-triggered fetch | ibid. |
| `PerplexityBot` | Perplexity | Search index | `perplexity.com/perplexitybot.json` |
| `Perplexity-User` | Perplexity | User fetch — Perplexity asserts it is "an agent, not a bot" and **not bound by robots.txt** | `perplexity.com/perplexity-user.json` |
| `Googlebot` | Google | Search **and AI Overviews / AI Mode** — never block | `developers.google.com/crawling/ipranges/common-crawlers.json` |
| `Google-Extended` | Google | **robots.txt policy token only** — Gemini training opt-out. Not a crawler, no user agent, no IP range. Does not affect Search ranking. | n/a |
| `Bingbot` | Microsoft | Search + Copilot | — |
| `Applebot` / `Applebot-Extended` | Apple | Search / training opt-out token | — |
| `Meta-ExternalAgent` | Meta | Training | — |
| `Amazonbot` | Amazon | Index (Alexa, Rufus) | — |
| `CCBot` | Common Crawl | Public corpus, bootstraps many datasets | — |
| `Bytespider` | ByteDance | Training — **documented non-compliance** with robots.txt | — |

Notes: OpenAI's docs state settings are independent — you can allow `OAI-SearchBot` while disallowing `GPTBot`. robots.txt changes take **~24 hours** to propagate to OpenAI's search systems. `ChatGPT-User` is user-initiated, so *"robots.txt rules may not apply."* Anthropic retired `Claude-Web` in favor of `Claude-User` + `Claude-SearchBot`. User agents are trivially spoofed — verify against published IP feeds or FCrDNS before acting on logs.

### 5.4 Newer conventions

**IETF AI Preferences WG (`aipref`)** — Active. Chairs Mark Nottingham, Suresh Krishnan; Area Director Mike Bishop. Two deliverables:
- `draft-ietf-aipref-vocab` — **at -07** (latest listed -06 dated 2026-04-27), WG document, intended **Proposed Standard**, milestone Aug 2026 to IESG.
- `draft-ietf-aipref-attach` — *Associating AI Usage Preferences with Content in HTTP*. Defines a **`Content-Usage` HTTP response header** (structured-field dictionary) **and** a `Content-Usage` directive for robots.txt. **-04 expired**; **-05 is current, expires 20 February 2027.** IANA registration of `Content-Usage` is requested but not granted.

Example forms from the draft:
```http
Content-Usage: train-ai=n
```
```
User-agent: *
Allow: /
Content-Usage: train-ai=n
```

**Status: not an RFC, not deployed, no production consumption signal.** The WG charter explicitly excludes technical enforcement — this communicates preferences, it does not block anyone.

**`ai.txt`** — Two distinct things share the name. Spawning Inc's 2023 TDM opt-out file at `/ai.txt`, and a 2026 individual IETF submission `draft-car-ai-txt-wellknown-00` proposing `/.well-known/ai.txt` as a typed superset (training, scraping, indexing, caching, per-agent rules, licensing, attribution, audit). The latter is an **individual submission under review, not WG-adopted**, expiring 2026-12-14; IANA well-known registrations for `ai.txt` (#76) and `ai.json` (#77) are **filed, under review**.

**Adoption is a rounding error: 0.1% of 1,744 prominent domains, flat Q2→Q3 2026.** And of 164 domains publishing *any* AI discovery file, **zero referenced a formal specification.**

**Skip `ai.txt`.** Nothing reads it, and for a nonprofit that *wants* to be indexed there is nothing to express.

### 5.5 Recommended policy for a nonprofit that wants to be indexed and cited

**Position: allow everything, block nothing.** A public-good transparency site benefits from being in training corpora *and* retrieval indexes — being the memorized answer is more durable than being a retrieved link, and there is no revenue model to protect. The only thing worth excluding is non-content surface area.

```
# https://example.org/robots.txt
# Public-good nonprofit. We want to be crawled, indexed, cited, and learned from.
# Contact: contact@example.org

User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/internal/
Disallow: /donate/receipt/
Disallow: /*?utm_
Disallow: /*?session=
Disallow: /search?

Sitemap: https://example.org/sitemap.xml
```

That's it. One `User-agent: *` block. Reasoning:

- **Do not enumerate AI bots to "allow" them.** A per-bot `Allow: /` block adds no permission that `User-agent: *` doesn't already grant, and it creates a maintenance liability: every new bot token you *don't* list still falls through to `*`, but a typo'd block silently overrides it. The one legitimate reason to name a bot is to treat it *differently*, and you don't want to.
- **Never block `Googlebot` or `Bingbot`.** They gate AI Overviews, AI Mode, and Copilot.
- **Never block `OAI-SearchBot`, `Claude-SearchBot`, or `PerplexityBot`.** These gate citations in the three engines that produce clickable attributions.
- **Do not block `Google-Extended`, `GPTBot`, `ClaudeBot`, or `CCBot`.** Training inclusion is how a nonprofit becomes the memorized answer to "who runs the X memorial fund." Blocking them costs durable recall and buys nothing.
- **Disallow only non-content paths**: admin, internal APIs, personalized receipt pages, tracking-parameter and session-parameter URL variants, and internal search result pages (infinite crawl space, thin content).
- **Do not add `Content-Usage`** yet — the draft has expired-and-been-replaced once, nothing consumes it, and a nonprofit that wants indexing has no preference to express. Revisit if `draft-ietf-aipref-attach` reaches RFC.
- **Check your CDN and WAF.** Cloudflare and similar now ship default AI-bot blocking that silently overrides a permissive robots.txt. This is the single most common way sites accidentally disappear from ChatGPT.

**Content practices that actually move citations, ranked by evidence strength:**

1. **Publish original, reconciled data with explicit dates.** Totals, allocations, grants, expense categories. This is the one thing a model cannot get from anywhere else, and it makes you the primary source rather than a repeater.
2. **Put a visible `dateModified` on every page, and mean it.** Freshness is the highest-leverage measured signal (§5.2). Reconcile and republish on a real cadence.
3. **Answer questions in the page's own prose**, with the question as a heading and a direct 2–3 sentence answer immediately under it, before any elaboration. This is retrievable-chunk formatting; it works regardless of whether you ship `FAQPage` markup.
4. **Entity clarity:** one canonical name, used identically everywhere; `Organization`/`NGO` markup with `sameAs` pointing at Wikidata, Charity Navigator, Candid/GuideStar, and your verified social profiles; a stable `@id`. This is what feeds training-based recall.
5. **Make important content textual and server-rendered.** Numbers rendered only by client-side JS may not survive retrieval.
6. **Ensure structured data matches visible text.** Google names this explicitly; mismatches are the fastest route to a manual action.
7. **Internal linking** so every transparency page is reachable in a couple of hops.
8. **Skip:** AI-only content variants, chunking gimmicks, keyword-stuffed FAQ blocks, purchased mentions, and any "GEO" tactic premised on llms.txt.

---

## 6. Schema.org for a donation campaign

Schema.org current release: **v30.0, published 2026-03-19**.

### 6.1 What's actually supported by Google in 2026

| Type | Google rich result? | Verdict |
|---|---|---|
| `Organization` / `NGO` | **Yes** — knowledge panel, logo, attribution. No required properties; add what applies. | **Ship it.** Homepage or About page only. |
| `BreadcrumbList` | **Yes** — the Breadcrumb feature. | **Ship it.** |
| `Article` / `NewsArticle` | **Yes** — Article feature (headline, large image). | **Ship it** on updates. |
| `WebSite` | Partially — `name` + `alternateName` + `url` feed the **Site Names** feature. `SearchAction` is inert (sitelinks searchbox discontinued 21 Nov 2024). | **Ship `WebSite`, drop `SearchAction`.** |
| `FAQPage` | **No.** FAQ rich results stopped appearing **7 May 2026**, including the 2023 gov/health carve-out. Search Console appearance filter, rich-result report, and Rich Results Test support dropped June 2026; Search Console API support removed August 2026; the dedicated docs were removed 15 June 2026. | Valid markup, **zero Google rich result.** Optional. |
| `QAPage` | **Yes** — the Q&A feature is still in the gallery, with a supported-properties update logged 2026-03-24. But it's for **community Q&A with multiple user answers.** | **Don't use it as an FAQPage substitute.** Wrong semantics for editorial FAQs. |
| `Person` | No standalone rich result. `ProfilePage` exists but requires the subject be **affiliated with the website** (author page, forum profile, employee page). | Use `Person` as a **linked entity**, not a page-level rich-result play. |
| `DonateAction` | **No documented Google rich result.** Not in the search gallery. Usage: 1K–10K domains (Google web index, July 2026). | Safe as semantic markup. See caveat below. |
| `MonetaryGrant` | No rich result. In v30.0. | Useful for machine-readable grant transparency. |
| `WebPage` | No rich result; a container type. | Optional; low value beyond `dateModified`. |

**On `DonateAction`:** widely repeated SEO advice claims a `potentialAction: DonateAction` can trigger a "Donate" button in Google results. **There is no Google documentation supporting this**, and `DonateAction` does not appear in the structured data gallery. Google's actual donate features run through Google for Nonprofits / Google Ad Grants programs, not markup. Add `DonateAction` because it is semantically honest and machine-readable for agents — **not** because it will produce a button. Don't let anyone budget against that.

### 6.2 What is safe and non-deceptive

**Do:**
- Mark up **only what is visible on the page.** Google's guidelines require structured data to match visible text; mismatch is a manual-action risk.
- Use `NGO` **only if you genuinely are one**, and `nonprofitStatus` only with your actual registration (e.g. `https://schema.org/Nonprofit501c3` for a US 501(c)(3)).
- Use `DonateAction` as a **`potentialAction`** — a declaration that donating is *possible here*. That is a true statement about a donate page.
- Point `sameAs` at independently verifiable records: Wikidata, Charity Navigator, Candid/GuideStar, official registries, verified social profiles.
- Give the beneficiary `Person` a stable `@id` and reference it by `@id` everywhere else.
- Use real `taxID` / `legalName` / `foundingDate`. These are trust signals precisely because they're checkable.

**Don't:**
- **Don't emit a completed `DonateAction`** (with `actionStatus: CompletedActionStatus`, a `price`, and an `agent`) on a public page. That asserts a donation *occurred*. It belongs only on a private receipt page, if anywhere.
- **Don't use `Review` or `AggregateRating`** on the organization or the campaign. Ratings of a memorial fund are both meaningless and a self-serving-review policy violation.
- **Don't mark up a fundraising goal as an `Offer` or `Product`.** A donation is not a product with a price.
- **Don't ship `FAQPage` for questions that aren't visibly on the page.** No rich result to gain, and it's the textbook deceptive-markup pattern.
- **Don't use `NewsArticle` for a campaign update.** Reserve it for genuine journalism; use `Article` or `BlogPosting`.
- **Don't invent `interactionStatistic` counts** for the beneficiary, and don't use `ProfilePage` for a deceased subject who is not a creator affiliated with the site — it fails Google's content guidelines.
- **Don't put `deathDate` on a living person, or estimate one.** Only assert what the family has published.
- **Don't add `SearchAction`** to new markup expecting a searchbox.

### 6.3 Minimal JSON-LD

**Homepage — Organization/NGO + WebSite.** One `<script>`, `@graph`, stable `@id`s.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "NGO",
      "@id": "https://example.org/#organization",
      "name": "Example Memorial Foundation",
      "alternateName": "EMF",
      "legalName": "Example Memorial Foundation, Inc.",
      "url": "https://example.org/",
      "logo": "https://example.org/logo.png",
      "description": "A registered 501(c)(3) foundation funding [purpose] in memory of Jane Doe.",
      "nonprofitStatus": "https://schema.org/Nonprofit501c3",
      "taxID": "12-3456789",
      "foundingDate": "2026-02-14",
      "email": "contact@example.org",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "1 Example Street",
        "addressLocality": "Springfield",
        "addressRegion": "IL",
        "postalCode": "62701",
        "addressCountry": "US"
      },
      "sameAs": [
        "https://www.wikidata.org/wiki/Q000000",
        "https://www.charitynavigator.org/ein/123456789",
        "https://www.guidestar.org/profile/12-3456789"
      ],
      "potentialAction": {
        "@type": "DonateAction",
        "name": "Donate to the Example Memorial Foundation",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://example.org/donate",
          "actionPlatform": [
            "https://schema.org/DesktopWebPlatform",
            "https://schema.org/MobileWebPlatform"
          ]
        },
        "recipient": { "@id": "https://example.org/#organization" }
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://example.org/#website",
      "name": "Example Memorial Foundation",
      "alternateName": "EMF",
      "url": "https://example.org/",
      "publisher": { "@id": "https://example.org/#organization" }
    }
  ]
}
</script>
```

**Beneficiary page — deceased subject.** `Person` with `deathDate`; `mainEntity` on a `WebPage`, not `ProfilePage`.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://example.org/beneficiary#webpage",
  "url": "https://example.org/beneficiary",
  "name": "About Jane Doe",
  "dateModified": "2026-09-01",
  "isPartOf": { "@id": "https://example.org/#website" },
  "mainEntity": {
    "@type": "Person",
    "@id": "https://example.org/#jane-doe",
    "name": "Jane Doe",
    "birthDate": "1985-03-12",
    "deathDate": "2025-11-04",
    "description": "Community organizer and teacher, in whose memory this foundation was established.",
    "image": "https://example.org/images/jane-doe.jpg",
    "sameAs": ["https://www.wikidata.org/wiki/Q000001"]
  }
}
</script>
```

Only include `birthDate` / `deathDate` / `sameAs` if published and family-approved. Omit rather than approximate.

**Campaign update — Article + BreadcrumbList.**

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": "https://example.org/updates/q3-2026#article",
      "headline": "Q3 2026: $412,000 disbursed to 14 partner organizations",
      "datePublished": "2026-09-01T09:00:00-05:00",
      "dateModified": "2026-09-08T14:20:00-05:00",
      "image": ["https://example.org/images/q3-2026-16x9.jpg"],
      "author": { "@id": "https://example.org/#organization" },
      "publisher": { "@id": "https://example.org/#organization" },
      "isPartOf": { "@id": "https://example.org/#website" },
      "about": { "@id": "https://example.org/#jane-doe" },
      "mainEntityOfPage": "https://example.org/updates/q3-2026"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home",    "item": "https://example.org/" },
        { "@type": "ListItem", "position": 2, "name": "Updates", "item": "https://example.org/updates" },
        { "@type": "ListItem", "position": 3, "name": "Q3 2026" }
      ]
    }
  ]
}
</script>
```

The last breadcrumb item omits `item` — correct, it's the current page.

**Grants transparency — `MonetaryGrant`.** No rich result, but honest machine-readable disclosure and exactly the original data that earns citations (§5.2).

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "MonetaryGrant",
  "@id": "https://example.org/grants/2026-014",
  "name": "Q3 2026 grant to Springfield Community Kitchen",
  "amount": { "@type": "MonetaryAmount", "currency": "USD", "value": 25000 },
  "funder": { "@id": "https://example.org/#organization" },
  "fundedItem": {
    "@type": "Organization",
    "name": "Springfield Community Kitchen",
    "url": "https://springfieldkitchen.example"
  },
  "url": "https://example.org/grants/2026-014"
}
</script>
```

**FAQ page — optional.** If you ship it, the questions and answers must be visibly on the page, verbatim.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Is my donation tax-deductible?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Yes. Example Memorial Foundation is a registered 501(c)(3) organization (EIN 12-3456789). Donations from U.S. taxpayers are tax-deductible to the extent allowed by law. You will receive a receipt by email immediately after donating."
    }
  }]
}
</script>
```

Cost/benefit: no Google rich result since 7 May 2026, and the "FAQ schema helps AI citations" claim is **unproven** — the Ahrefs test usually cited pooled multiple schema types across ~1,885 pages and found only **+2.2%**. Ship it if your FAQ content is real and you want the semantic clarity; **do not** ship it expecting visibility. The visible Q&A heading structure (§5.5 item 3) does the retrievability work either way.

---

## 7. Consolidated do / don't

### WebMCP
| Do | Don't |
|---|---|
| Use `document.modelContext.registerTool(tool, { signal })` | Use `navigator.modelContext` or `provideContext()` — removed |
| Feature-detect and no-op silently | Assume the API exists, or let a registration failure break the page |
| Return a plain string or plain JSON value | Return `{ content: [{ type: "text" }] }` — that's MCP, not WebMCP |
| Unregister via `AbortController` | Look for `unregisterTool()` — it doesn't exist |
| Set `readOnlyHint` / `untrustedContentHint` / `consequentialHint` on every tool | Rely on `consequentialHint` as your only payment confirmation |
| Ship read-only tools first | Expose `submit_donation`, admin, or PII tools |
| Validate server-side and reuse the human UI's service layer | Trust `inputSchema` as a security boundary |
| Return descriptive error prose the model can retry on | Throw opaque errors |
| Stay inside Chrome's character budgets | Write 2,000-char descriptions |
| Hand-roll ~30 lines of ambient types | Install the abandoned `webmcp` npm package |
| Keep `Origin-Agent-Cluster` default | Send `Origin-Agent-Cluster: ?0` (kills WebMCP) |

### MCP
| Do | Don't |
|---|---|
| Target `2026-07-28` with `@modelcontextprotocol/server@2` | Start new work on `@modelcontextprotocol/sdk@1.x` |
| Use stdio (local) or Streamable HTTP (remote) | Implement legacy HTTP+SSE |
| Write transport-agnostic services with Zod schemas | Couple business logic to either SDK |
| Plan for stateless requests, header routing, MRTR | Design around sessions or `Mcp-Session-Id` — removed |
| Skip Roots / Sampling / Logging in new code | Adopt deprecated primitives |

### Discoverability & AEO
| Do | Don't |
|---|---|
| Ship one hand-written `/llms.txt` and stop | Build an llms.txt pipeline or expect citations from it |
| One permissive `robots.txt`; verify the CDN isn't blocking | Enumerate per-bot `Allow` blocks, or block training crawlers |
| Publish original reconciled data with visible dates | Chase AI-specific "optimizations" Google says don't exist |
| Question-as-heading, direct answer underneath | Keyword-stuff FAQ blocks |
| One canonical entity name + `sameAs` to Wikidata/Candid | Vary your organization name across pages |
| Re-publish on a real cadence | Let transparency pages go stale (45-point Perplexity freshness gap) |
| Skip `ai.txt` and `Content-Usage` | Ship drafts nothing consumes |

### Schema.org
| Do | Don't |
|---|---|
| `NGO` + `WebSite` (homepage), `BreadcrumbList`, `Article`, `MonetaryGrant` | `SearchAction`, `Review`/`AggregateRating`, `Offer` for donations |
| `DonateAction` as `potentialAction` on the donate page | Completed `DonateAction` on a public page, or budgeting for a "Donate button" |
| `Person` + `deathDate` as a linked entity with stable `@id` | `ProfilePage` for a deceased non-affiliated subject |
| Mark up only visible text | `FAQPage` for invisible questions |
| Real `taxID`, `legalName`, `nonprofitStatus`, verifiable `sameAs` | Aspirational or unverifiable claims |

---

## 8. Stability flags and lowest-risk recommendations

| Area | Stability | Lowest-risk implementation |
|---|---|---|
| **WebMCP API shape** | **Very unstable.** CG draft; two breaking renames in 2026; WebKit opposed; TAG review incomplete; ship decision pending for M157. | Confine all WebMCP code to **one file** exporting one function. Feature-detect. Read-only tools only. Zero WebMCP code in your service layer. If the API changes again, you edit one file. |
| **WebMCP HITL** | **Unresolved.** `requestUserInteraction` removed; `requestUserInput` proposed, unlanded. Chrome docs are stale on this. | Do not expose any money-moving tool. `consequentialHint: true` on anything state-changing, and a real human click in your own UI. |
| **WebMCP typings** | Unstable; no official types; `@mcp-b/webmcp-types@5.1.0` lags spec on `consequentialHint` and the `execute` signal arg. | Hand-roll the ~30-line ambient declaration (§1.8a). No dependency, no lag. |
| **WebMCP `RegisteredTool.inputSchema`** | Changed shape mid-flight: string in Chrome 149–153, parsed object from 154 ([webmcp#241](https://github.com/webmachinelearning/webmcp/issues/241)). | Only matters if you *consume* `getTools()`. If you must, branch on `typeof` and guard the parse. |
| **WebMCP declarative API** | Less mature than imperative; `toolactivated` event still unspecified ([webmcp#146](https://github.com/webmachinelearning/webmcp/issues/146)). | Prefer the imperative API. |
| **MCP `2026-07-28`** | Newly stable but young; wire-incompatible both directions; SDK repo throttling PRs while v2 settles. | Don't build the MCP server yet. Design the service layer so an adapter is ~50 lines (§3.6). |
| **`llms.txt` v2** | Convention, not a standard; already revised once; near-zero consumption by answer engines. | One hand-written static file. No tooling, no `.md` twins, no `llms-full.txt`. |
| **`llms-full.txt`** | Not in the spec at all. | Skip. |
| **IETF `Content-Usage`** | Draft; -04 expired, -05 expires 2027-02-20; not an RFC; no deployment. | Don't ship. Revisit at RFC. |
| **`ai.txt`** | Individual submission, not WG-adopted; 0.1% adoption, flat. | Skip. |
| **Google `FAQPage`** | Feature dead as of 2026-05-07; type still valid. | Optional. Ship visible Q&A structure regardless; the markup is a coin flip. |
| **`WebSite` + `SearchAction`** | Dead since 2024-11-21. | Keep `WebSite` (`name`/`alternateName`/`url`) for Site Names. Drop `SearchAction`. |
| **`DonateAction` → Google button** | Unsupported claim; not in Google's gallery. | Ship for semantics. Don't promise anyone a button. |
| **AEO tactics** | Vendor-blog claims routinely outrun evidence. | Anchor to Google's own AI optimization guide plus the freshness and original-data findings. Ignore the rest. |

### The one-paragraph recommendation

Build the site as an ordinary, fast, server-rendered, well-structured HTML site with honest Schema.org and a permissive `robots.txt` — that is what actually gets a nonprofit cited in 2026, and Google says so directly. Add a single hand-written `/llms.txt` because it costs half an hour. For WebMCP, write your application services as transport-agnostic functions with Zod schemas, then add **one** isolated file that registers three or four **read-only** tools behind a feature check, with `readOnlyHint: true` and no money-moving capability. That file is disposable when the spec churns again, and the service layer underneath is exactly what a future standalone MCP server (`@modelcontextprotocol/server@2`) will reuse without modification. Do not implement the MCP server, `ai.txt`, `Content-Usage`, or `llms-full.txt` yet.

---

## Appendix: primary sources

**WebMCP**
- Spec (Draft CG Report, 4 Sept 2026): https://webmachinelearning.github.io/webmcp/
- Explainer repo: https://github.com/webmachinelearning/webmcp
- WebKit position (oppose): https://github.com/WebKit/standards-positions/issues/670
- Charter proposal: https://github.com/w3c/charter-drafts/pull/829 · https://github.com/w3c/strategy/issues/560
- TAG review: https://github.com/w3ctag/design-reviews/issues/1238
- Chrome overview / imperative / declarative / security / best practices / MCP comparison: https://developer.chrome.com/docs/ai/webmcp{,/imperative-api,/declarative-api,/secure-tools,/best-practices,/compare-mcp}
- Agent-side security: https://developer.chrome.com/docs/agents/security
- Chrome Status: https://chromestatus.com/feature/5117755740913664
- Intent to Experiment: https://groups.google.com/a/chromium.org/g/blink-dev/c/gmYffo5WOE8

**MCP**
- Spec (latest = 2026-07-28): https://modelcontextprotocol.io/specification/2026-07-28
- Transports: https://modelcontextprotocol.io/specification/2026-07-28/basic/transports
- Release announcement: https://blog.modelcontextprotocol.io/posts/2026-07-28/
- TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk · docs https://ts.sdk.modelcontextprotocol.io/v2/

**llms.txt**
- https://llmstxt.org/ (v2)
- Ahrefs 137K-site study: https://ahrefs.com/blog/llmstxt-study/
- Search Atlas citation analysis: https://searchatlas.com/blog/limits-of-llms-txt-for-ai-search-citation-study/
- EZY server-log study: https://www.ezy.ai/research/do-ai-bots-read-llms-txt
- AI Discovery File adoption Q3 2026: https://www.ai-visibility.org.uk/research/2026-q3/

**AEO / crawlers**
- Google, optimizing for generative AI features: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google, AI features and your website: https://developers.google.com/search/docs/appearance/ai-features
- OpenAI crawlers: https://platform.openai.com/docs/bots
- IETF aipref WG: https://datatracker.ietf.org/wg/aipref/documents/
- `draft-ietf-aipref-attach-05`: https://datatracker.ietf.org/doc/html/draft-ietf-aipref-attach-05
- `draft-car-ai-txt-wellknown-00`: https://www.ietf.org/archive/id/draft-car-ai-txt-wellknown-00.html

**Schema.org / Google structured data**
- Schema.org v30.0 (2026-03-19): https://schema.org/version/latest
- Search gallery (authoritative list of supported features): https://developers.google.com/search/docs/appearance/structured-data/search-gallery
- Organization: https://developers.google.com/search/docs/appearance/structured-data/organization
- Documentation changelog (FAQ deprecation, May/June 2026): https://developers.google.com/search/updates
- "Farewell, Sitelinks Search Box" (2024-10-21): https://developers.google.com/search/blog/2024/10/sitelinks-search-box
- https://schema.org/NGO · https://schema.org/DonateAction · https://schema.org/MonetaryGrant
