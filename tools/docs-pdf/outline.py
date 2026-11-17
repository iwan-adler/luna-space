"""Print the PDF outline (bookmarks) as JSON: [[level, title, page_number], ...]."""
import json, sys
from pypdf import PdfReader

r = PdfReader(sys.argv[1])
out = []

def walk(items, level):
    for it in items:
        if isinstance(it, list):
            walk(it, level + 1)
        else:
            try:
                p = r.get_destination_page_number(it) + 1
            except Exception:
                p = None
            out.append([level, str(it.title), p])

walk(r.outline, 1)
print(json.dumps({"pages": len(r.pages), "outline": out}))
