"""Launch script for the POS Toko Material web application."""

import uvicorn

if __name__ == "__main__":
    print("\n=======================================================")
    print(" MENJALANKAN POS TOKO MATERIAL & BANGUNAN (STRICT WHITE)")
    print(" Buka browser di: http://127.0.0.1:8000")
    print("=======================================================\n")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
