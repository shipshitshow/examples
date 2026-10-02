# ShieldCheck - Mini Shai-Hulud Supply Chain Attack Scanner

> Supply chain integrity scanner for the Mini Shai-Hulud TanStack attack vector.

## Context

The **Mini Shai-Hulud** supply chain attack compromised 84+ TanStack npm artifacts, `@opensearch-project/opensearch`, `@squawk/*` packages, and PyPI packages (`mistralai`, `guardrails-ai`). The attack exploited GitHub Actions OIDC token theft via `pull_request_target` abuse and cache poisoning to publish malicious package versions. The malware harvests credentials (GitHub, AWS, Vault, K8s), persists via `.claude/` and `.vscode/` directories, and exfiltrates data through the Session P2P network.

**ShieldCheck** is a zero-dependency Node.js CLI tool that scans local projects for signs of this specific attack, producing color-coded console output and self-contained HTML/Markdown reports.

---

## Compromised Packages

### npm
| Scope / Package | Affected Versions | Notes |
|---|---|---|
| `@tanstack/*` | 84 artifacts | Full scope compromise |
| `@opensearch-project/opensearch` | 3.5.3, 3.6.2, 3.7.0, 3.8.0 | optionalDependencies injection |
| `@squawk/mcp` | 0.9.5 | Campaign expansion |
| `@squawk/weather` | 0.5.10 | Campaign expansion |
| `@squawk/flightplan` | 0.5.6 | Campaign expansion |

### PyPI
| Package | Affected Version |
|---|---|
| `mistralai` | 2.4.6 |
| `guardrails-ai` | 0.10.1 |

---

## Indicators of Compromise

### Malicious File Hashes

| File | SHA256 | Severity |
|---|---|---|
| `router_init.js` | `ab4fcadaec49c03278063dd269ea5eef82d24f2124a8e15d7b90f2fa8601266c` | CRITICAL |
| `tanstack_runner.js` | `2ec78d556d696e208927cc503d48e4b5eb56b31abc2870c2ed2e98d6be27fc96` | CRITICAL |

### Network IOCs

| Indicator | Type | Severity |
|---|---|---|
| `filev2.getsession[.]org/file/` | Exfiltration endpoint | CRITICAL |
| `git-tanstack.com` | Malicious domain (payload delivery) | CRITICAL |
| `getsession.org` | C2 via Session P2P | HIGH |

### Persistence Artifacts

| Path | Severity | Description |
|---|---|---|
| `.claude/router_runtime.js` | CRITICAL | Malware persistence via Claude Code |
| `.claude/settings.json` | HIGH | Claude config hijack (hooks/MCP) |
| `.claude/setup.mjs` | CRITICAL | Claude Code setup hijack |
| `.vscode/tasks.json` | HIGH | VS Code task persistence |
| `.vscode/setup.mjs` | CRITICAL | VS Code setup hijack |

### Git Indicators
- **Spoofed author:** `claude@users.noreply.github.com`
- **Suspicious account:** `voicproducoes`

---

## App Architecture

```
mdtohtml/
  package.json
  bin/
    shieldcheck.js              # CLI entry point
  src/
    ioc-database.js             # All IOC definitions
    scanner-engine.js           # Orchestrator
    scanners/
      file-hash-scanner.js      # SHA256 matching
      package-scanner.js        # package.json/lockfile analysis
      persistence-scanner.js    # .claude/ and .vscode/ detection
      git-history-scanner.js    # Git log analysis
      obfuscation-scanner.js    # JS Obfuscator pattern detection
      network-ioc-scanner.js    # Domain/URL scanning
      node-modules-scanner.js   # Deep node_modules inspection
    reporters/
      console-reporter.js       # Color-coded terminal output
      html-reporter.js          # Self-contained HTML5 report
      md-reporter.js            # Markdown report
    utils/
      file-walker.js            # Async generator traversal
      hash.js                   # SHA256 via Node crypto
      logger.js                 # Structured logging
      ansi.js                   # ANSI color constants
```

---

## Scanner Modules

### 1. File Hash Scanner
Walks all `.js/.mjs/.cjs` files, computes SHA256 via streaming, matches against IOC hashes. Also flags files named `router_init.js`, `tanstack_runner.js`, or `router_runtime.js` regardless of hash. Uses 8-way parallel reads with a semaphore.

### 2. Package Scanner
Parses `package.json` for compromised dependencies. Checks `package-lock.json` for unexpected `resolved` URLs and `integrity` mismatches. Detects malicious `optionalDependencies` injection (attack signature). Flags suspicious lifecycle scripts.

### 3. Persistence Scanner
Checks for IOC persistence paths. Parses `.claude/settings.json` for hooks/MCP servers. Parses `.vscode/tasks.json` for shell tasks. Flags any `.mjs` files inside `.claude/` or `.vscode/`.

### 4. Git History Scanner
Runs `git log --since=2025-04-01`. Checks author emails against IOC actors. Checks commit messages against known attack patterns. Reports changed files for flagged commits. Gracefully skips non-git directories.

### 5. Obfuscation Scanner
Tests JS files against JavaScript Obfuscator signatures (`_0x` patterns, hex encoding, `eval`+`atob`, `Function` constructor). Calculates Shannon entropy per file (threshold: 5.5 bits/char). Allowlists minified bundles.

### 6. Network IOC Scanner
Scans text files for malicious domains/URLs. Checks for base64-encoded C2 domains. Scans `.env` files for staged credential exfiltration. Reports file, line number, and context.

### 7. Node Modules Scanner
Inspects installed packages matching compromised scopes. Reads `_resolved`/`_integrity` from package metadata. Searches for unexpected files in package directories. Checks `node_modules/.cache/` for cache poisoning.

---

## Severity & Verdict System

| Level | Weight | Meaning |
|---|---|---|
| CRITICAL | 10 | Known malware IOC match |
| HIGH | 5 | Strong indicator of compromise |
| MEDIUM | 2 | Potential concern, needs investigation |
| LOW | 1 | Minor anomaly |
| INFO | 0 | Informational |

**Verdict logic:**
- **COMPROMISED** — any CRITICAL finding, or total score >= 20
- **SUSPICIOUS** — any HIGH finding, or total score >= 5
- **CLEAN** — otherwise

---

## CLI Usage

```
shieldcheck [target-dir] [options]

  -o, --output <format>    console | html | md | all (default: console)
  -d, --deep               Deep scan including node_modules internals
  -v, --verbose            Show INFO level findings
  --output-dir <path>      Report directory (default: ./shieldcheck-reports)
  --since <date>           Git history start date (default: 2025-04-01)
  --no-color               Disable colored output
  -h, --help               Show help
```

**Exit codes:** `0` = CLEAN, `1` = SUSPICIOUS, `2` = COMPROMISED

---

## Implementation Order

1. **Foundation** — `package.json`, `utils/` (ansi, logger, hash, file-walker)
2. **IOC Database** — `ioc-database.js` with all attack indicators
3. **Scanner Engine** — `scanner-engine.js` orchestrator
4. **Scanners** — all 7 modules (built in parallel)
5. **Reporters** — console, HTML, Markdown
6. **CLI** — `bin/shieldcheck.js` entry point

---

## Design Principles

- **Zero dependencies** — a security tool must not trust external packages; every line is auditable
- **Async generators** — memory-efficient traversal for large `node_modules` trees
- **`Promise.allSettled`** — one failing scanner doesn't abort the rest
- **Streaming hashes** — no OOM on large files
- **Self-contained HTML** — no CDN, works offline, can't be tampered with via MITM
- **Node 18+ required** — built-in `node:test`, `fs/promises`, `crypto`

---

## Verification Plan

1. Run `shieldcheck .` on the project itself (expect CLEAN)
2. Create test fixtures with planted IOCs (malicious hash, persistence files, compromised dependency, C2 domain in source)
3. Run `shieldcheck test-fixtures/ --output all` and verify all 3 outputs
4. Confirm HTML report makes zero network requests (browser DevTools)
5. Verify exit code 2 for COMPROMISED fixture

---

## Generation Metrics

| Metric | Value |
|---|---|
| Plan format | Markdown |
| Estimated output tokens | ~3,800 |
| Estimated input tokens | ~8,200 |
| Model | Claude Opus 4.6 |
| Generated | 2026-05-12 |
