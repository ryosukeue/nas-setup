"use client";

const steps = [
  { number: "01", title: "所有者", detail: "NASとImmichのアカウント" },
  { number: "02", title: "PC写真", detail: "WindowsのP:ドライブ" },
  { number: "03", title: "スマホ", detail: "Immichとntfy通知" },
  { number: "04", title: "遠隔接続", detail: "Tailscaleと保守権限" },
];

export function NasConsole() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brandMark" aria-hidden="true">N</span>
          <div><strong>写真NAS</strong><span>かんたんセットアップ</span></div>
        </div>
        <div className="connection"><i /> LAN接続済み</div>
      </header>

      <section className="hero">
        <div className="eyebrow">WELCOME</div>
        <h1>写真をまとめる準備を<br />はじめましょう。</h1>
        <p>この画面だけで、Windowsの写真フォルダ、スマホのImmich、故障通知まで設定できます。コマンド操作は必要ありません。</p>
        <button className="primary" type="button">初期設定をはじめる <span>→</span></button>
      </section>

      <section className="statusPanel" aria-label="NASの状態">
        <div className="statusLead">
          <span className="statusIcon">✓</span>
          <div><strong>NASは正常です</strong><small>2台のHDDを確認しました</small></div>
        </div>
        <div className="metric"><span>RAID</span><strong>正常</strong><small>2 / 2 HDD</small></div>
        <div className="metric"><span>空き容量</span><strong>1.8 TB</strong><small>写真を保存可能</small></div>
        <div className="metric"><span>Immich</span><strong>準備済み</strong><small>初期登録待ち</small></div>
      </section>

      <section className="stepsSection">
        <div className="sectionTitle"><span>設定内容</span><small>約10分</small></div>
        <div className="stepsGrid">
          {steps.map((step) => (
            <article className="stepCard" key={step.number}>
              <span className="stepNumber">{step.number}</span>
              <h2>{step.title}</h2>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <footer>LAN内の端末から <b>nas.local</b> でいつでも戻れます</footer>
    </main>
  );
}
