import {
  XMRigProxyClient,
  XMRigProxyError,
  createStatusTracker,
  getAcceptanceRate,
  getRecentMinerPeak,
  getStatusInfo,
} from "xmrig-proxy-client";

const clientOptions = {
  url: "https://proxy.example.test",
  token: "secret",
  timeoutMs: 1000,
};

const client = new XMRigProxyClient(clientOptions);
const requestOptions = {
  headers: {
    Accept: "application/json",
  },
};

async function exerciseClient() {
  const info = await client.getInfo(requestOptions);
  const summary = await client.getSummary(requestOptions);
  const connection = await client.getConnection(requestOptions);
  const config = await client.getConfig(requestOptions);
  const access = await client.probeWriteAccess(requestOptions);

  const infoValue: unknown = info["any-field"];
  const minerCount: number | string | undefined = summary.miners?.now;
  const connectionValue: unknown = connection["any-field"];
  const configValue: unknown = config["any-field"];
  const accessValue: "unrestricted" | "restricted" | "unknown" = access;

  void infoValue;
  void minerCount;
  void connectionValue;
  void configValue;
  void accessValue;
}

function exerciseHealth() {
  const tracker = createStatusTracker({
    warningRatio: 0.5,
  });

  const status = getStatusInfo(
    {
      uptime: 60,
      miners: {
        now: 2,
        max: 2,
      },
      results: {
        accepted: 20,
        rejected: 0,
      },
    },
    tracker,
  );

  const peak: number = getRecentMinerPeak(tracker);
  const acceptanceRate: number | null = getAcceptanceRate(tracker);

  void status;
  void peak;
  void acceptanceRate;
}

const error = new XMRigProxyError("example", {
  status: 403,
  url: "https://proxy.example.test/1/config",
  cause: new Error("denied"),
});

const errorStatus: number | null = error.status;
const errorUrl: string | null = error.url;
const errorCause: unknown = error.cause;

void errorStatus;
void errorUrl;
void errorCause;
void exerciseClient;
void exerciseHealth;
