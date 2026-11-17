# Planning PDF builder

Renders `docs/specs/*.md` into `planning/pdf/*.pdf` and `planning/Luna_Space_Planning_Documents.zip`.

Requirements: Google Chrome (or set `CHROME_PATH`), Python 3 with `pypdf` (`pip install pypdf`).

```bash
cd tools/docs-pdf
npm install
npm run build        # all six documents (two passes each so the contents page has page numbers)
node build.mjs 03    # one document
npm run check        # report elements wider than the page and diagrams scaled below ~70 %
```

Writing conventions: `## N. Title` starts a new page; `> **Decision:** …` / `> **Security:** …` render as callouts;
```` ```mermaid ```` blocks become diagrams; raw HTML with `wf-*` classes renders wireframes (see `style.css`).
