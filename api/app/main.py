from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.routers import auth, library, me, messages, reports, social, study
from app.seed import seed_library

settings = get_settings()
app = FastAPI(title="Flashcard English API", version="0.3.0")

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
        # Lightweight auto-migration for existing DBs
        db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(40)"))
        db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(300)"))
        db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(32) DEFAULT 'local'"))
        db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255)"))
        db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)"))
        db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_seed VARCHAR(120) DEFAULT ''"))
        db.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_goal_reviews INTEGER DEFAULT 20"))
        db.execute(text("ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false"))
        db.execute(text("ALTER TABLE user_decks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true"))
        db.execute(text("ALTER TABLE library_cards ADD COLUMN IF NOT EXISTS level VARCHAR(20)"))
        db.execute(
            text(
                """
                UPDATE library_cards c
                SET level = d.level
                FROM library_decks d
                WHERE c.deck_id = d.id
                  AND (c.level IS NULL OR c.level = '')
                """
            )
        )

        # Study logs snapshots & nullable deck/card IDs
        db.execute(text("ALTER TABLE study_session_logs ADD COLUMN IF NOT EXISTS deck_title_snapshot VARCHAR(255) DEFAULT ''"))
        db.execute(text("ALTER TABLE study_session_logs ADD COLUMN IF NOT EXISTS deck_level_snapshot VARCHAR(20)"))
        db.execute(text("ALTER TABLE study_session_logs ADD COLUMN IF NOT EXISTS deck_topic_snapshot VARCHAR(80)"))

        db.execute(text("ALTER TABLE review_logs ADD COLUMN IF NOT EXISTS front_text_snapshot TEXT DEFAULT ''"))
        db.execute(text("ALTER TABLE review_logs ADD COLUMN IF NOT EXISTS back_text_snapshot TEXT DEFAULT ''"))

        db.execute(text("ALTER TABLE exercise_attempts ADD COLUMN IF NOT EXISTS deck_title_snapshot VARCHAR(255) DEFAULT ''"))

        db.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_sub ON users (google_sub)"))
        db.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username)"))

        db.execute(text("UPDATE users SET auth_provider = 'local' WHERE auth_provider IS NULL OR auth_provider = ''"))
        db.execute(text("UPDATE users SET daily_goal_reviews = 20 WHERE daily_goal_reviews IS NULL OR daily_goal_reviews < 1"))
        db.execute(text("UPDATE users SET avatar_seed = COALESCE(NULLIF(avatar_seed, ''), NULLIF(username, ''), 'user')"))
        db.execute(text("UPDATE users SET bio = NULL WHERE bio = ''"))
        db.execute(text("UPDATE user_decks SET is_active = true WHERE is_active IS NULL"))
        
        # Simple username generator for migration
        null_usernames = db.execute(text("SELECT id, email FROM users WHERE username IS NULL OR username = ''")).all()
        for row in null_usernames:
            base = "".join(ch.lower() for ch in row[1].split("@")[0] if ch.isalnum() or ch in {"_", "."}).strip("._")
            if len(base) < 3:
                base = "user"
            uname = base[:40]

            idx = 1
            while db.execute(
                text("SELECT id FROM users WHERE username = :u AND id != :i"),
                {"u": uname, "i": row[0]},
            ).first():
                suffix = f"_{idx}"
                uname = f"{base[: max(1, 40 - len(suffix))]}{suffix}"
                idx += 1

            db.execute(text("UPDATE users SET username = :u WHERE id = :i"), {"u": uname, "i": row[0]})

        db.commit()
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
app.include_router(social.router)
app.include_router(messages.router)
