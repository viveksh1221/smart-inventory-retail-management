from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker,Session


DATABASE_URL="sqlite:///./retail.db"

engine=create_engine(
    DATABASE_URL,connect_args={"check_same_thread":False}
)
sessionlocal=sessionmaker(bind=engine)

Base=declarative_base()

def get_db():
    db=sessionlocal()
    try:
        yield db
    finally:
        db.close()