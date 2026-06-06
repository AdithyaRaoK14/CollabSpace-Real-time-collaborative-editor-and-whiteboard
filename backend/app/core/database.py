from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    poolclass=None,
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    # Import models so SQLAlchemy registers them with Base.metadata
    from app.models.user import User
    from app.models.room import Room, RoomMember
    from app.models.document import Document

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
