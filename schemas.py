from pydantic import BaseModel
class ProductCreate(BaseModel):
    name:str
    description:str
    category:str
    price:int
    stock:int
class UserCreate(BaseModel):
    username:str
    password:str