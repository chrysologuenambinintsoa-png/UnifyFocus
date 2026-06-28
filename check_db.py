import sqlite3
for f in ["db/app.db", "db/custom.db"]:
    try:
        conn = sqlite3.connect(f)
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [t[0] for t in cursor.fetchall()]
        print(f, tables)
        conn.close()
    except Exception as e:
        print(f, "ERROR:", e)

