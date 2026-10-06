from sqlalchemy import Column,Integer,String,Float
from db import Base
class Product(Base):
    __tablename__="products"
    id=Column(Integer,primary_key=True,index=True)
    name=Column(String,nullable=False)
    description=Column(String)
    category=Column(String)
    price=Column(Integer,nullable=False)
    stock=Column(Integer,default=0)
class User(Base):
    __tablename__="users"
    id=Column(Integer,primary_key=True,index=True)
    username=Column(String,unique=True,index=True,nullable=False)
    password=Column(String,nullable=False)