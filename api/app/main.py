from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.routers import auth, library, me, reports, study
from app.seed import seed_library

settings = get_settings()
app = FastAPI(title="Flashcard English API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_library(db)
    finally:
        db.close()


@app.get("/")
def health():
    return {"status": "ok", "service": "flashcard-api"}


app.include_router(auth.router)
app.include_router(library.router)
app.include_router(me.router)
app.include_router(study.router)
app.include_router(reports.router)
