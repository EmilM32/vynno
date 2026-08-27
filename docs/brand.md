# Vynno brand

Canonical product identity. UI copy and the README should match this file.

## Name

|           |                                    |
| --------- | ---------------------------------- |
| **Name**  | Vynno                              |
| **Say**   | VIN-oh (`/ˈvɪn.oʊ/`)               |
| **Spell** | Vynno — double _n_                 |
| **Not**   | Vyno, Vino, Vynnoo, VYNNO in prose |

Do not expand it as an acronym. It is not “Very … Something.”

## Meaning

Coined. No dictionary root.

The name is a playful invented word (same family as Toggl or Figma). It is not locked to developers or to timers, so the product can stay a focus-time tool for anyone.

The double _n_ is the brand. Protect that spelling.

## Lines

- **Tagline:** Where the hours went.
- **One-liner:** Vynno is a focus timer — projects, sessions, and a clear week.

## Voice

Friendly name, serious tool. The chrome is dense and IDE-like — precise, not cute. Save playfulness for the name itself, not for button labels.

## Do / don’t

| Do                                                           | Don’t                                             |
| ------------------------------------------------------------ | ------------------------------------------------- |
| Use **Vynno** in the shell, titles, and new user-facing copy | Use a former working name in UI or marketing copy |
| Teach pronunciation once (README, Settings → About)          | Invent a backronym                                |
| Link here when someone asks what the name means              | Rename `--dt-*` tokens as part of a copy tweak    |

## Mark

A **session ring** with a **play-V** in the gap (3 o’clock). The ring is focus / elapsed time; the wedge is start, with a V-notch on its left edge. Not a downward letter-V (that silhouette is Vue).

| Asset   | Path                                                              | Use                                                            |
| ------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| Mark    | [`src/lib/assets/logo-mark.svg`](../src/lib/assets/logo-mark.svg) | Symbol only. Change the root `fill` to recolor.                |
| Lockup  | [`src/lib/assets/logo.svg`](../src/lib/assets/logo.svg)           | Mark + outlined Inter “Vynno”. Same recolor.                   |
| Favicon | [`src/lib/assets/favicon.svg`](../src/lib/assets/favicon.svg)     | Mark on a rounded tile; dark/light via `prefers-color-scheme`. |

In the product the mark is `BrandMark.svelte` (`currentColor` / `text-primary`) beside the live Inter wordmark — sidebar, mobile top bar, and login. Do not replace the word with the SVG lockup in the UI.

Keep the path `d` identical across the three SVGs and `BrandMark.svelte`.

## Repo vs product

The public name, this repository, and the npm package are **Vynno** / `vynno`. The companion API is [vynno-api](https://github.com/EmilM32/vynno-api).

CSS prefix `--dt-*` stays until a deliberate token rename. That is not a public-name change.

## In the product

Settings → **About Vynno** is the in-app home for pronunciation and meaning.

## Public rename checklist

How to change the **user-facing** name. This is not a git-repo rename. Decision: [ADR-0009](./adr/0009-product-name.md).

1. Update this file first (name, pronunciation, tagline, one-liner, spelling).
2. `messages/en.json` — `app_name`, `title_app`, Settings About strings (`settings_about_*`).
3. Shell — brand comes from `m.app_name()`. Do not hardcode the name in `nav.ts`.
4. Settings About copy — must still match this file.
5. Root `README.md` and `docs/README.md` headings.
6. `AGENTS.md` opener.
7. `e2e/navigation.spec.ts` — shell brand assertion.
8. Amend [ADR-0009](./adr/0009-product-name.md) if the decision changed. Do not invent a new ADR number for a copy-only rename.

Leave `--dt-*` tokens alone. After copy edits: `npm run check`, `npm test`, and at least the navigation + settings e2e projects.
