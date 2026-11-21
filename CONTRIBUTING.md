# Contributing

Thanks for your interest. Planning is a small project with a deliberate scope: a read-only list of Google calendar events, readable offline. Read [docs/context/PRODUCT.md](docs/context/PRODUCT.md) first, especially its "Out of scope" section, so that your idea fits.

## Before you code

Open an issue and describe the need. For a bug, say how to reproduce it. For a feature, say the problem it solves, not only the solution. A pull request for a change nobody discussed may be declined.

## Set up

Node (version in `.nvmrc`) and pnpm. To work without a Google account, `DEV_FAKE_DATA=1 pnpm dev` serves fake calendars. All the commands and conventions are in [docs/operations/DEVELOPMENT.md](docs/operations/DEVELOPMENT.md).

## Before you open a pull request

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Also:

- Write everything in English: code, comments, identifiers, commits, issues. Only the translations of the interface, in `src/lib/i18n/locales`, use other languages.
- Every interface text goes through the dictionaries, in all six languages.
- Update the documents under `docs/` that cover the code you changed, and add a line to [CHANGELOG.md](CHANGELOG.md).
- Keep the pull request focused on one change, branch from `main`, and do not push to `main`.

## License

By contributing, you agree that your contribution is released under the [MIT license](LICENSE) of the project.
