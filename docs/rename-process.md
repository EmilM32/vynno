# Public name change

How to change the **user-facing** product name (DevTime → Vynno, or the next rename). This is not a git-repo rename.

Decision record: [ADR-0009](./adr/0009-product-name.md). Voice and spelling: [brand.md](./brand.md).

## Two layers

| Layer           | What it is                                       | Change on a public rename?             |
| --------------- | ------------------------------------------------ | -------------------------------------- |
| **Public name** | What people see and say                          | Yes                                    |
| **Plumbing**    | Package, CSS prefix, storage key                 | No, unless you are doing a full rename |

## Public rename checklist

1. Update [brand.md](./brand.md) first (name, pronunciation, tagline, one-liner, spelling).
2. `messages/en.json` — `app_name`, `title_app`, Settings About strings (`settings_about_*`).
3. Shell — brand comes from `m.app_name()`. Do not hardcode the name in `nav.ts`.
4. Settings About copy — must still match brand.md.
5. Root `README.md` — title, pronunciation, tagline, link to brand.md.
6. `docs/README.md` — index heading if it uses the product name.
7. `docs/prd.md` — **Product name** line, SHELL-1, assumption about the name.
8. `AGENTS.md` — opener (note the former name if agents will hit old docs).
9. `e2e/navigation.spec.ts` — shell brand assertion.
10. Add or amend the product-name ADR if the decision changed.

Do **not** rewrite every historical ADR or domain-model title. Those can keep the old name as history.

## Leave alone (unless a full rename)

- `package.json` `"name"` (`dev-time`)
- CSS tokens `--dt-*`
- `localStorage` key `devtime-theme` (see ADR-0008)
- Historical ADR titles and context that say DevTime

## After copy edits

```sh
npm run check
npm test
npm run test:e2e
```

Paraglide compiles `messages/en.json` through the Vite plugin. `npm run check` / `npm run dev` pick up new keys. At minimum, run the **navigation** and **settings** e2e projects so the shell brand and About card are covered.
