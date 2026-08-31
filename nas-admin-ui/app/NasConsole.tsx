"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Disk = { device: string; present: boolean; smartPassed: boolean | null };
type Status = {
  initialized: boolean;
  authenticated: boolean;
  hostname: string;
  ownerName?: string;
  share?: string;
  ntfyConfigured?: boolean;
  tailscale?: boolean;
  tailscaleState?: string;
  tailscaleDnsName?: string;
  immichExternalUrl?: string;
  adminExternalUrl?: string;
  tailscaleExternalReady?: boolean;
  handoffReady?: boolean;
  handoffComplete?: boolean;
  disk: {
    raid: { healthy: boolean; active: number; expected: number; members: string };
    disks: Disk[];
    storage: { total: number; used: number; free: number };
  };
  immich: { online: boolean; initialized: boolean };
};

type SupportRequest = {
  id: string;
  created_at: string;
  reason: string;
  status: "pending" | "approved" | "denied";
  expires_at?: string;
};

const steps = [
  { number: "01", title: "所有者", detail: "NASとImmichのアカウント" },
  { number: "02", title: "PC写真", detail: "WindowsのP:ドライブ" },
  { number: "03", title: "スマホ", detail: "Immichとntfy通知" },
  { number: "04", title: "遠隔接続", detail: "Tailscaleと保守権限" },
];

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "処理に失敗しました");
  return result;
}

function bytes(value: number) {
  return `${(value / 1_000_000_000_000).toFixed(1)} TB`;
}

function Shell({ children, connected = true }: { children: React.ReactNode; connected?: boolean }) {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brandMark" aria-hidden="true">N</span>
          <div><strong>写真NAS</strong><span>かんたんセットアップ</span></div>
        </div>
        <div className={`connection ${connected ? "" : "offline"}`}><i /> {connected ? "LAN接続済み" : "確認中"}</div>
      </header>
      {children}
      <footer>LAN内の端末から <b>nas.local</b> でいつでも戻れます</footer>
    </main>
  );
}

function Loading() {
  return <Shell connected={false}><section className="centerState"><div className="spinner" /><strong>NASを確認しています</strong></section></Shell>;
}

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api("/api/login", { method: "POST", body: JSON.stringify({ password }) }); onDone(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "ログインできませんでした"); }
    finally { setBusy(false); }
  }
  return (
    <Shell><section className="authWrap"><form className="formCard compact" onSubmit={submit}>
      <div className="eyebrow">OWNER LOGIN</div><h1>NASを管理する</h1>
      <p>初期設定で決めたNAS管理パスワードを入力してください。</p>
      <label>管理パスワード<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      {error && <div className="errorBox">{error}</div>}
      <button className="primary full" disabled={busy}>{busy ? "確認中…" : "ログイン"}</button>
    </form></section></Shell>
  );
}

function Setup({ status, onDone }: { status: Status; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [samePasswords, setSamePasswords] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", ownerPassword: "", immichPassword: "", smbPassword: "" });

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api("/api/setup", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          immichPassword: samePasswords ? form.ownerPassword : form.immichPassword,
          smbPassword: samePasswords ? form.ownerPassword : form.smbPassword,
        }),
      });
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "初期設定に失敗しました");
    } finally { setBusy(false); }
  }

  return (
    <Shell>
      <section className="hero">
        <div className="eyebrow">WELCOME</div>
        <h1>写真をまとめる準備を<br />はじめましょう。</h1>
        <p>この画面だけで、Windowsの写真フォルダ、スマホのImmich、故障通知まで設定できます。コマンド操作は必要ありません。</p>
        <button className="primary" type="button" onClick={() => setOpen(true)}>初期設定をはじめる <span>→</span></button>
      </section>

      <section className="statusPanel" aria-label="NASの状態">
        <div className="statusLead"><span className="statusIcon">✓</span><div><strong>NASは正常です</strong><small>{status.disk.raid.active}台のHDDを確認しました</small></div></div>
        <div className="metric"><span>RAID</span><strong>{status.disk.raid.healthy ? "正常" : "要確認"}</strong><small>{status.disk.raid.active} / {status.disk.raid.expected} HDD</small></div>
        <div className="metric"><span>空き容量</span><strong>{bytes(status.disk.storage.free)}</strong><small>写真を保存可能</small></div>
        <div className="metric"><span>IMMICH</span><strong>{status.immich.online ? "準備済み" : "停止中"}</strong><small>初期登録待ち</small></div>
      </section>

      <section className="stepsSection"><div className="sectionTitle"><span>設定内容</span><small>約10分</small></div><div className="stepsGrid">
        {steps.map((step) => <article className="stepCard" key={step.number}><span className="stepNumber">{step.number}</span><h2>{step.title}</h2><p>{step.detail}</p></article>)}
      </div></section>

      {open && <div className="modalBackdrop"><form className="formCard" onSubmit={submit}>
        <button className="close" type="button" aria-label="閉じる" onClick={() => setOpen(false)}>×</button>
        <div className="eyebrow">STEP 1 / 4</div><h2>所有者を登録</h2>
        <p>この情報でNAS管理、Windows共有、Immichをまとめて準備します。</p>
        <div className="formGrid">
          <label>表示名<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="例：山田 太郎" required /></label>
          <label>メールアドレス<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Immichのログインに使用" required /></label>
          <label className="wide">NAS管理パスワード<input type="password" minLength={8} value={form.ownerPassword} onChange={(event) => setForm({ ...form, ownerPassword: event.target.value })} placeholder="8文字以上" required /></label>
          <label className="wide inlineCheck"><input type="checkbox" checked={samePasswords} onChange={(event) => setSamePasswords(event.target.checked)} />ImmichとWindows共有にも同じパスワードを使う</label>
          {!samePasswords && <>
            <label>Immichパスワード<input type="password" minLength={8} value={form.immichPassword} onChange={(event) => setForm({ ...form, immichPassword: event.target.value })} required /></label>
            <label>Windows共有パスワード<input type="password" minLength={8} value={form.smbPassword} onChange={(event) => setForm({ ...form, smbPassword: event.target.value })} required /></label>
          </>}
        </div>
        <div className="noteBox">Windows共有のユーザー名は <b>nasowner</b> です。パスワードはあとから管理画面で変更できます。</div>
        {error && <div className="errorBox">{error}</div>}
        <button className="primary full" disabled={busy}>{busy ? "写真フォルダとImmichを準備中…" : "まとめて設定する"}</button>
      </form></div>}
    </Shell>
  );
}

function Dashboard({ status, refresh }: { status: Status; refresh: () => void }) {
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [notice, setNotice] = useState<{ subscribeUrl: string; webUrl: string } | null>(null);
  const [tailscaleUrl, setTailscaleUrl] = useState("");
  const [tailscaleConsentUrl, setTailscaleConsentUrl] = useState("");
  const [showSmbPassword, setShowSmbPassword] = useState(false);
  const [newSmbPassword, setNewSmbPassword] = useState("");
  const load = useCallback(async () => {
    try {
      const [support, notification] = await Promise.all([
        api<SupportRequest[]>("/api/support/requests"), api<{ subscribeUrl: string; webUrl: string }>("/api/notifications"),
      ]);
      setRequests(support); setNotice(notification);
    } catch { /* status page remains useful if a secondary request fails */ }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!tailscaleUrl || status.tailscaleState === "Running") return;
    const timer = window.setInterval(refresh, 3000);
    return () => window.clearInterval(timer);
  }, [refresh, status.tailscaleState, tailscaleUrl]);

  async function testNotification() {
    setMessage("通知を送っています…");
    try { await api("/api/notifications/test", { method: "POST" }); setMessage("スマホへテスト通知を送りました"); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "通知に失敗しました"); }
  }
  async function decide(id: string, decision: "approve" | "deny") {
    await api(`/api/support/requests/${id}/${decision}`, { method: "POST" }); await load();
  }
  async function changeSmbPassword(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/smb/password", { method: "POST", body: JSON.stringify({ password: newSmbPassword }) });
      setNewSmbPassword(""); setShowSmbPassword(false);
      setMessage("Windows共有パスワードを変更しました。Windows側を接続し直してください。");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "パスワードを変更できませんでした");
    }
  }
  async function connectTailscale() {
    if (!window.confirm("現在のTailscale接続を解除し、所有者のアカウントへ接続し直します。続けますか？")) return;
    const result = await api<{ authUrl?: string }>("/api/tailscale/start", { method: "POST" });
    if (result.authUrl) setTailscaleUrl(result.authUrl);
  }
  async function configureTailscale() {
    setMessage("外出先アクセスを設定しています…");
    try {
      const result = await api<{ ok: boolean; consentUrl?: string; error?: string }>("/api/tailscale/configure", { method: "POST" });
      if (result.consentUrl) {
        setTailscaleConsentUrl(result.consentUrl);
        setMessage("Tailscale側でHTTPSを許可し、その後もう一度設定してください。");
      } else if (result.ok) {
        setTailscaleConsentUrl(""); setMessage("外出先からImmichを開けるようになりました。"); refresh();
      } else {
        setMessage(result.error || "外出先アクセスを設定できませんでした");
      }
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "外出先アクセスを設定できませんでした");
    }
  }
  async function completeHandoff() {
    if (!window.confirm("構築用ryoログインを永久に停止します。今後の保守は、あなたが許可した固定操作だけになります。続けますか？")) return;
    try {
      await api("/api/handoff/complete", { method: "POST", body: JSON.stringify({ confirm: true }) });
      setMessage("引き渡しが完了しました。構築用ログインは停止されました。");
      window.setTimeout(refresh, 1200);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "引き渡しを完了できませんでした");
    }
  }
  const immichLanUrl = `${window.location.protocol}//${window.location.hostname}:2283`;
  const immichUrl = status.immichExternalUrl || immichLanUrl;
  const health = status.disk.raid.healthy && status.disk.disks.every((disk) => disk.present && disk.smartPassed !== false);

  return (
    <Shell>
      <section className="dashboardHero"><div><div className="eyebrow">OWNER DASHBOARD</div><h1>{status.ownerName || "所有者"}さんの写真NAS</h1><p>{health ? "HDD、RAID、主要サービスは正常です。" : "確認が必要な項目があります。"}</p></div><span className={`healthBadge ${health ? "" : "danger"}`}>{health ? "✓ 正常" : "! 要確認"}</span></section>

      <section className="statusPanel dashboardStatus">
        <div className="statusLead"><span className="statusIcon">✓</span><div><strong>RAID1 {status.disk.raid.members}</strong><small>{status.disk.raid.active} / {status.disk.raid.expected} HDD 稼働中</small></div></div>
        <div className="metric"><span>空き容量</span><strong>{bytes(status.disk.storage.free)}</strong><small>{bytes(status.disk.storage.total)} 中</small></div>
        <div className="metric"><span>IMMICH</span><strong>{status.immich.online ? "稼働中" : "停止"}</strong><small>{status.immich.initialized ? "登録済み" : "準備中"}</small></div>
        <div className="metric"><span>TAILSCALE</span><strong>{status.tailscaleExternalReady ? "外出先OK" : status.tailscaleState === "Running" ? "接続済み" : status.tailscale ? "認証待ち" : "停止"}</strong><small>外出先・遠隔保守</small></div>
      </section>

      <section className="actionGrid">
        <article className="actionCard accent"><span className="cardKicker">WINDOWS</span><h2>PC写真フォルダ</h2><p><code>{status.share}</code> を空いているドライブへ追加し、再起動後も自動接続します。</p><a className="cardButton" href="/api/windows-connect.cmd">接続ツールをダウンロード</a><div className="minorActions"><button onClick={() => setShowSmbPassword(!showSmbPassword)}>共有パスワードを変更</button><a href="/api/windows-disconnect.cmd">接続解除ツール</a></div>{showSmbPassword && <form className="inlineForm" onSubmit={changeSmbPassword}><input type="password" minLength={8} value={newSmbPassword} onChange={(event) => setNewSmbPassword(event.target.value)} placeholder="新しい共有パスワード" required /><button>変更</button></form>}</article>
        <article className="actionCard"><span className="cardKicker">IMMICH</span><h2>写真を見る</h2><p>スマホ写真とPC写真を同じタイムラインで表示します。{status.tailscaleExternalReady ? "外出先からも利用できます。" : "現在はLAN内から利用できます。"}</p><a className="cardButton secondary" href={immichUrl} target="_blank" rel="noreferrer">Immichを開く</a></article>
        <article className="actionCard"><span className="cardKicker">NTFY</span><h2>故障通知</h2><p>スマホでQRを読み、HDD異常と保守申請を受け取ります。</p><button className="cardButton secondary" onClick={testNotification}>テスト通知を送る</button></article>
      </section>

      <section className="splitSection">
        <article className="panel"><div className="panelHead"><div><span className="cardKicker">ANDROID NOTIFICATION</span><h2>ntfyをスマホへ登録</h2></div></div>
          <div className="qrRow"><img src="/api/notifications/qr.png" alt="ntfy通知登録用QRコード" /><div><ol><li>スマホにntfyをインストール</li><li>このQRコードを読み取る</li><li>下のボタンで通知を確認</li></ol>{notice && <div className="noticeLinks"><a href={notice.subscribeUrl}>スマホのntfyで開く</a><a href={notice.webUrl} target="_blank" rel="noreferrer">PCブラウザで通知を見る</a></div>}{message && <div className="inlineMessage">{message}</div>}</div></div>
        </article>
        <article className="panel"><div className="panelHead"><div><span className="cardKicker">REMOTE ACCESS</span><h2>Tailscale</h2></div></div>
          {!status.handoffReady && <><p>所有者本人のTailscaleへNASを登録します。スマホと外出先PCにもTailscaleアプリが必要です。</p><button className="cardButton secondary" onClick={connectTailscale}>所有者のTailscaleへ接続</button></>}
          {tailscaleUrl && status.tailscaleState !== "Running" && <a className="authLink" href={tailscaleUrl} target="_blank" rel="noreferrer">Tailscaleの認証を開く →</a>}
          {status.handoffReady && status.tailscaleState !== "Running" && <p className="waitingText">Tailscaleの認証完了を待っています。この画面は自動更新されます。</p>}
          {status.tailscaleState === "Running" && !status.tailscaleExternalReady && <><p>接続を確認しました。次にImmichと管理画面を、所有者のTailscale内だけでHTTPS公開します。</p><button className="cardButton secondary" onClick={configureTailscale}>外出先アクセスを設定</button></>}
          {tailscaleConsentUrl && <a className="authLink" href={tailscaleConsentUrl} target="_blank" rel="noreferrer">TailscaleでHTTPSを許可する →</a>}
          {status.tailscaleExternalReady && <div className="remoteReady"><strong>✓ 外出先アクセス準備済み</strong><img src="/api/immich/qr.png" alt="Immich外出先URLのQRコード" /><small>スマホで読み取るか、ImmichアプリのサーバーURLへ入力</small><code>{status.immichExternalUrl}</code><div className="appLinks"><a href="https://play.google.com/store/apps/details?id=com.tailscale.ipn" target="_blank" rel="noreferrer">Tailscaleを入れる</a><a href="https://play.google.com/store/apps/details?id=app.alextran.immich" target="_blank" rel="noreferrer">Immichを入れる</a></div></div>}
          {status.tailscaleExternalReady && !status.handoffComplete && <div className="handoffBox"><strong>最後の引き渡し操作</strong><p>外出先からImmichを開けることを確認後、構築用ログインを停止します。</p><button onClick={completeHandoff}>引き渡しを完了する</button></div>}{status.handoffComplete && <div className="handoffDone">✓ 引き渡し済み・構築用ログイン停止</div>}
        </article>
      </section>

      <section id="support" className="panel supportPanel"><div className="panelHead"><div><span className="cardKicker">SUPPORT ACCESS</span><h2>保守権限の申請</h2></div><span>許可は1時間</span></div>
        {requests.length === 0 ? <div className="empty">現在、保守申請はありません。</div> : requests.map((item) => <div className="requestRow" key={item.id}><div><strong>{item.reason}</strong><small>{new Date(item.created_at).toLocaleString("ja-JP")}</small></div><span className={`requestStatus ${item.status}`}>{item.status === "pending" ? "確認待ち" : item.status === "approved" ? "許可済み" : "拒否"}</span>{item.status === "pending" && <div className="requestActions"><button onClick={() => decide(item.id, "deny")}>拒否</button><button className="approve" onClick={() => decide(item.id, "approve")}>1時間許可</button></div>}</div>)}
      </section>

      <div className="dashboardFoot"><button onClick={refresh}>状態を更新</button><button onClick={async () => { await api("/api/logout", { method: "POST" }); refresh(); }}>ログアウト</button></div>
    </Shell>
  );
}

export function NasConsole() {
  const [status, setStatus] = useState<Status | null>(null);
  const refresh = useCallback(async () => { try { setStatus(await api<Status>("/api/status")); } catch { setStatus(null); } }, []);
  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  if (!status) return <Loading />;
  if (!status.initialized) return <Setup status={status} onDone={refresh} />;
  if (!status.authenticated) return <Login onDone={refresh} />;
  return <Dashboard status={status} refresh={refresh} />;
}
