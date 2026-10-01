# xmrig-proxy-client

Zero-dependency XMRig Proxy HTTP API client and health monitor for Node.js, browsers, Deno, Bun, and Cloudflare Workers.

The package extracts the reusable pieces from the companion [XMRig Proxy Dashboard](https://github.com/wjc2821296948/XMRig-Proxy-Dashboard): API transport, authentication headers, timeout handling, write-access probing, and the production-oriented miner health state machine.

## Install

```bash
npm install xmrig-proxy-client
```

## 发布渠道

每次发布 GitHub Release（tag 必须与 `package.json` 版本对应，例如 `v0.1.0`），`.github/workflows/publish.yml` 会自动执行测试并发布到两个注册表：

- **npmjs.com**：`xmrig-proxy-client`
- **GitHub Packages**：`@wjc2821296948/xmrig-proxy-client`

GitHub Packages 使用同一个 `repository` 字段关联到本仓库，因此发布后可以直接在仓库的 **Packages** 中管理版本。GitHub Packages 的 npm 注册表只接受 scoped package，所以 workflow 会在发布前临时生成 `@wjc2821296948/xmrig-proxy-client`，不会改变 npmjs.com 上的包名。

### 首次配置 npm Trusted Publishing

在 npmjs.com 的 `xmrig-proxy-client` 包设置中添加 GitHub Actions Trusted Publisher，并填写：

- GitHub owner: `wjc2821296948`
- Repository: `xmrig-proxy-client`
- Workflow filename: `publish.yml`

之后 GitHub Actions 使用 OIDC 发布 npm，不需要在仓库里保存长期 npm Token。

GitHub Packages 发布使用工作流自带的 `GITHUB_TOKEN`，需要的 `packages: write` 权限已经写入 workflow。

> 注意：GitHub Packages 的 npm 包首次发布默认是 **Private**。首次发布后，请在 GitHub 的 Package settings 中将其改为 **Public**；之后新版本会继续沿用该可见性设置。
## API client

```js
import { XMRigProxyClient } from "xmrig-proxy-client";

const proxy = new XMRigProxyClient({
  url: "https://proxy.example.com",
  token: process.env.XMRIG_PROXY_TOKEN,
});

const summary = await proxy.getSummary();

console.log(summary.miners.now);
console.log(summary.hashrate?.total);
```

Supported read endpoints:

- `getInfo()` -> `GET /1/`
- `getSummary()` -> `GET /1/summary`
- `getConnection()` -> `GET /1/connection`
- `getConfig()` -> `GET /1/config`
- `probeWriteAccess()` -> `unrestricted | restricted | unknown`

The client uses the standard `fetch` API and has no runtime dependencies. Pass a custom `fetch` implementation when a host environment needs one.

### Errors

Failed HTTP responses throw `XMRigProxyError` with a `status` field when an HTTP status is available. Tokens are never included in the generated error message.

## Health monitor

The health monitor consumes the `/1/summary` response and keeps the temporal state that a UI or alerting service should not have to rebuild.

```js
import {
  createStatusTracker,
  getStatusInfo,
  getAcceptanceRate,
  getRecentMinerPeak,
} from "xmrig-proxy-client";

const tracker = createStatusTracker();
const status = getStatusInfo(summary, tracker);

console.log(status);
// { cls: "status-online", text: "在线" }

console.log(getRecentMinerPeak(tracker));
console.log(getAcceptanceRate(tracker));
```

The default state machine includes:

- a rolling 15-minute miner peak instead of the sticky lifetime maximum;
- a 20-second zero-miner grace period;
- restart detection from an uptime reset;
- two consecutive positive samples for recovery;
- acceptance/rejection delta analysis after at least 20 shares;
- a 60-second cold-start waiting state.

Use `resetStatusTracker(tracker)` when switching to a different Proxy process or data source.

## Browser / Workers

The package does not depend on Node-only APIs. It uses standard Web Platform primitives (`fetch`, `Headers`, `Response`, `AbortController`) and can therefore be bundled for browser applications and edge runtimes.

For a static ES module application, an import map can point the package specifier at a hosted ES module:

```html
<script type="importmap">
{
  "imports": {
    "xmrig-proxy-client": "https://cdn.jsdelivr.net/npm/xmrig-proxy-client@0.1.0/src/index.js"
  }
}
</script>
```

For production sites, pin an exact package version rather than a moving tag.

## Security model

The client only sends the token as an `Authorization: Bearer` header. It does not log tokens and does not persist configuration.

The package exposes only the HTTP methods implemented by the client; it does not add an implicit configuration-management layer.

## Development

```bash
npm test
```

The test suite uses Node's built-in `node:test` runner, so development and CI require no third-party dependencies.

## License

Apache License 2.0
