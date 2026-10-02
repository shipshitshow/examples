# Mobile Smoke Tests

This directory contains the mobile E2E smoke test specification for the OpenSora
iOS/Android app built with Expo.

## Status

The mobile app (`apps/mobile/`) is currently in the configuration phase — screens
and navigation are not yet implemented. The spec files here describe the flows
that must be covered once the app is built.

## Test Framework

Recommended: **Maestro** (simple YAML-based E2E runner that works with Expo Go
and production Expo builds).

Fallback: **Detox** (if the team needs deeper React Native integration test hooks).

Install Maestro:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Run a flow against a running Expo dev build:

```bash
maestro test tests/mobile-smoke/flows/
```

## CI Integration

Add a job to `.github/workflows/qa-smoke.yml` once the mobile app is deployable:

```yaml
mobile-smoke:
  runs-on: macos-latest
  steps:
    - uses: actions/checkout@v4
    - name: Install Maestro
      run: curl -Ls "https://get.maestro.mobile.dev" | bash
    - name: Run mobile smoke flows
      run: maestro test tests/mobile-smoke/flows/
      env:
        API_BASE_URL: ${{ secrets.STAGING_API_URL }}
```

## Coverage Matrix

| Flow                      | File                                    | Priority |
| ------------------------- | --------------------------------------- | -------- |
| Onboarding / sign-up      | `flows/01-onboarding.yaml`              | Critical |
| Login                     | `flows/02-login.yaml`                   | Critical |
| Prompt → Generate → Watch | `flows/03-create-flow.yaml`             | Critical |
| Gallery / history view    | `flows/04-gallery.yaml`                 | High     |
| Error: no network         | `flows/05-error-no-network.yaml`        | High     |
| Error: generation failure | `flows/06-error-generation-failed.yaml` | High     |
