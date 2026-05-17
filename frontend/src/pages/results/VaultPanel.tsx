import { useAppSession } from "../../session/AppSessionContext";

export function VaultPanel() {
  const {
    handleLockVault,
    handleRestoreEntry,
    handleVaultSubmit,
    vaultEntries,
    vaultExists,
    vaultNotice,
    vaultUnlocked,
    workspaceName,
    setWorkspaceName,
    workspacePassphrase,
    setWorkspacePassphrase,
  } = useAppSession();

  return (
    <div className="mt-4 space-y-4" role="tabpanel">
      <div className="panel-card-head panel-card-head--compact">
        <div className="panel-card-head-main">
          <p className="section-kicker">Private workspace</p>
          <h3 className="panel-subtitle mt-2">Encrypted local history</h3>
        </div>
        <span className={`vault-pill shrink-0 ${vaultUnlocked ? "vault-pill-open" : "vault-pill-closed"}`}>
          {vaultUnlocked ? "Unlocked" : vaultExists ? "Locked" : "New"}
        </span>
      </div>

      <p className="text-sm leading-7 text-slate-600">
        Files are never stored. Only the audit output can be saved, encrypted in this browser using your passphrase.
      </p>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleVaultSubmit}>
        <label className="field">
          <span className="field-label">Workspace name</span>
          <input
            className="field-input"
            onChange={(event) => setWorkspaceName(event.target.value)}
            placeholder="My private DataReady vault"
            value={workspaceName}
          />
        </label>
        <label className="field">
          <span className="field-label">Passphrase</span>
          <input
            autoComplete="current-password"
            className="field-input"
            onChange={(event) => setWorkspacePassphrase(event.target.value)}
            placeholder="Enter a passphrase"
            type="password"
            value={workspacePassphrase}
          />
        </label>

        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button className="button-primary" type="submit">
            {vaultUnlocked ? "Re-unlock workspace" : vaultExists ? "Unlock workspace" : "Create workspace"}
          </button>
          <button className="button-secondary" disabled={!vaultUnlocked} onClick={handleLockVault} type="button">
            Lock workspace
          </button>
        </div>
      </form>

      <div className="status-banner">
        <div aria-hidden="true" className="status-banner-dot" />
        <p>{vaultNotice}</p>
      </div>

      <div className="space-y-3">
        {vaultEntries.length > 0 ? (
          vaultEntries.map((entry) => (
            <article className="vault-entry" key={entry.id}>
              <div>
                <p className="vault-entry-title">{entry.title}</p>
                <p className="vault-entry-meta">
                  {new Date(entry.createdAt).toLocaleString()} · Score {entry.response.report.score} · {entry.response.report.grade}
                </p>
              </div>
              <button className="button-secondary" onClick={() => handleRestoreEntry(entry)} type="button">
                Restore
              </button>
            </article>
          ))
        ) : (
          <article className="empty-card">Save a run to see your encrypted private history here.</article>
        )}
      </div>
    </div>
  );
}
