"""Zip every NN_*.pdf in a folder: python make_zip.py <pdf_dir> <zip_path>."""
import glob, os, sys, zipfile

src, dest = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(os.path.join(src, "[0-9][0-9]_*.pdf")))
with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as zf:
    for f in files:
        zf.write(f, os.path.basename(f))
print(f"{dest}: {len(files)} PDFs")
