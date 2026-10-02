/**
 * Talks to eSim (the SSM / LHDN / … simulator) at ESIM_URL.
 *
 * ⚠ REBUILT 02.10.2026 — the original file was not in the handover. What is
 * known: the UI is at https://172.30.202.114:9089/esim/login, it lists
 * entities named "Ssm Enquiry Resp", "Ssm Roc Submission Resp", … whose rows
 * have numeric `id` and camelCase fields (`roc`, `newRoc`, `checkDigit`,
 * `delayMiliSeconds`). That is the shape of a JHipster application, so this
 * client speaks JHipster's REST API:
 *
 *   POST {ESIM_URL}/api/authenticate  {username, password, rememberMe}  → {id_token}
 *   GET  {ESIM_URL}/api/<entity>?page=N&size=500                         (Bearer token)
 *   POST {ESIM_URL}/api/<entity>          create
 *   PUT  {ESIM_URL}/api/<entity>/<id>     update
 *
 * NOT YET VERIFIED against the real eSim. `npm run esim:check` proves it
 * (read-only) before anything is written; if it fails, the message says which
 * call failed and the tester sends that output back.
 *
 * eSim sits on a private IP with a self-signed certificate, so certificate
 * checks are relaxed for THIS host only — nothing else in the run is affected.
 */
import * as https from "node:https";
import * as http from "node:http";
import { esimURL } from "@config/environments";

export type EsimRecord = Record<string, unknown> & { id?: number };

interface Reply {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function request(method: string, url: string, body?: unknown, token?: string): Promise<Reply> {
  const u = new URL(url);
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const lib = u.protocol === "http:" ? http : https;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      u,
      {
        method,
        rejectUnauthorized: false, // self-signed, private IP — this host only
        timeout: 60_000,
        headers: {
          Accept: "application/json",
          ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: data }));
      },
    );
    req.on("timeout", () => req.destroy(new Error(`timed out: ${method} ${url} (is the VPN connected?)`)));
    req.on("error", (e) => reject(new Error(`${method} ${url} failed: ${e.message} (is the VPN connected?)`)));
    if (payload) req.write(payload);
    req.end();
  });
}

export class EsimClient {
  private token = "";
  readonly base = esimURL();

  private api(path: string): string {
    return `${this.base}/api/${path.replace(/^\/+/, "")}`;
  }

  async connect(): Promise<void> {
    const username = (process.env.ESIM_USERNAME ?? "").trim();
    const password = (process.env.ESIM_PASSWORD ?? "").trim();
    if (!username || !password) {
      throw new Error("ESIM_USERNAME / ESIM_PASSWORD are empty in env/.staging.env-local.");
    }
    const r = await request("POST", this.api("authenticate"), { username, password, rememberMe: false });
    if (r.status !== 200) {
      throw new Error(
        `eSim login failed: POST ${this.api("authenticate")} → HTTP ${r.status}. ` +
          `First 200 chars: ${r.body.slice(0, 200)}`,
      );
    }
    let token = "";
    try {
      token = (JSON.parse(r.body) as { id_token?: string }).id_token ?? "";
    } catch {
      /* not JSON */
    }
    if (!token) {
      const auth = String(r.headers.authorization ?? "");
      token = auth.replace(/^Bearer\s+/i, "");
    }
    if (!token) throw new Error(`eSim login answered 200 but gave no token. First 200 chars: ${r.body.slice(0, 200)}`);
    this.token = token;
  }

  async close(): Promise<void> {
    this.token = "";
  }

  private need(): string {
    if (!this.token) throw new Error("EsimClient.connect() was not called.");
    return this.token;
  }

  private parse(r: Reply, what: string): unknown {
    if (r.status < 200 || r.status >= 300) {
      throw new Error(`eSim ${what} → HTTP ${r.status}. First 300 chars: ${r.body.slice(0, 300)}`);
    }
    try {
      return r.body ? JSON.parse(r.body) : {};
    } catch {
      throw new Error(`eSim ${what} did not answer JSON. First 200 chars: ${r.body.slice(0, 200)}`);
    }
  }

  /** Every row of an entity, page by page. */
  async list(entity: string): Promise<EsimRecord[]> {
    const size = 500;
    const all: EsimRecord[] = [];
    for (let page = 0; page < 200; page++) {
      const r = await request("GET", this.api(`${entity}?page=${page}&size=${size}&sort=id,asc`), undefined, this.need());
      const rows = this.parse(r, `GET ${entity}`) as EsimRecord[];
      if (!Array.isArray(rows)) throw new Error(`eSim GET ${entity} did not return a list.`);
      all.push(...rows);
      const total = Number(r.headers["x-total-count"] ?? NaN);
      if (rows.length < size || (Number.isFinite(total) && all.length >= total)) break;
    }
    return all;
  }

  async create(entity: string, row: EsimRecord): Promise<EsimRecord> {
    const { id: _drop, ...body } = row;
    const r = await request("POST", this.api(entity), body, this.need());
    return this.parse(r, `POST ${entity}`) as EsimRecord;
  }

  async update(entity: string, row: EsimRecord): Promise<EsimRecord> {
    if (row.id === undefined) throw new Error(`update(${entity}) needs an id.`);
    const r = await request("PUT", this.api(`${entity}/${row.id}`), row, this.need());
    return this.parse(r, `PUT ${entity}/${row.id}`) as EsimRecord;
  }
}
