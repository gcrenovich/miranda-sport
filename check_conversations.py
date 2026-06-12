import sqlite3
import glob
import os
import datetime

conv_dir = r"C:\Users\German A. IT\.gemini\antigravity-ide\conversations"
db_files = glob.glob(os.path.join(conv_dir, "*.db"))

for db_file in db_files:
    mtime = os.path.getmtime(db_file)
    dt = datetime.datetime.fromtimestamp(mtime)
    print(f"File: {os.path.basename(db_file)} | Modified: {dt}")
    try:
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"  Tables: {tables}")
        for t in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {t};")
            count = cursor.fetchone()[0]
            print(f"    Table {t}: {count} rows")
        conn.close()
    except Exception as e:
        print(f"  Error: {e}")
