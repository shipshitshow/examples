# Ship Sh!t Show examples

A shared index of demonstrations and planning artifacts tied to the livestream where they were made. The transcript and source notes live in [the vault](https://github.com/shipshitshow/vault); reusable production instructions live in [skills](https://github.com/shipshitshow/skills).

## Migration inventory

| Example | Source episode | Artifact | Status |
| --- | --- | --- | --- |
| agent-flow-debugger | [Livestream](https://www.youtube.com/watch?v=p-WXHu2gU2s) | historical-demo | Source migration pending |
| pocket-cad | [Livestream](https://www.youtube.com/watch?v=p-WXHu2gU2s) | historical-demo | Source migration pending |
| fps-arena | [Livestream](https://www.youtube.com/watch?v=p-WXHu2gU2s) | historical-demo | Source migration pending |
| opensora | [Livestream](https://www.youtube.com/watch?v=1wSZwDps9Vg) | historical-demo | Source migration pending |
| markdown-html-plan | [Livestream](https://www.youtube.com/watch?v=vI0VlQ5lULo) | planning-artifact | Source migration pending |
| free-model-distiller | [Livestream](https://www.youtube.com/watch?v=eYGDOk2HsOg) | historical-demo | Source migration pending |

The six source candidates have been assembled and checked locally. Code and third-party assets are not included in this index PR: redistribution rights and reuse terms remain under review. The historical public [opus48 repository](https://github.com/shipshitshow/opus48) already contains the three June demo sources; its own notices/terms still apply.

OpenSora and ShieldCheck links were checked against the source transcripts/history. ShieldCheck is a Markdown/HTML plan, not an implemented scanner. The distiller link was checked against original August 25 show notes and the recap transcript. Unknown exact original prompts remain unknown rather than reconstructed as originals.

## Planned source layout

Each source will live under `episodes/<recording-date>-<youtube-id>/<example-slug>/` with an episode link, README, example metadata and the original prompt when located. Recording and upload dates may differ. Missing prompts, unsupported services and inherited runtime failures must remain explicit.

Source publication excludes secrets, `.env*`, private experiment folders, dependencies and large media. Code licensing does not grant rights to personal likeness, third-party fonts, textures or sprites. Existing source repositories remain intact during migration.
