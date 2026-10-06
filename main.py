from fastapi import FastAPI,Depends,HTTPException
from db import Base,engine,get_db
from sqlalchemy.orm import Session
from models import Product,User
from schemas import ProductCreate,UserCreate
from auth import verify_password,create_token,verify_token,hash_password
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
import os


app = FastAPI()
origins=os.getenv("ALLOWED_ORIGINS","http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
    
)

Base.metadata.create_all(bind=engine)

#now creating an api
@app.post("/products")
def post_product(products:ProductCreate,db:Session=Depends(get_db),current_user:str=Depends(verify_token)):
    product=Product(name=products.name,description=products.description,category=products.category,price=products.price,stock=products.stock)
    db.add(product)
    db.commit()
    db.refresh(product)
    return{"message":"data uploaded"}
@app.get("/products")
def get_products(db:Session=Depends(get_db),current_user:str=Depends(verify_token)):
    products=db.query(Product).all()
    return{
        "total":len(products),
        "data":products
    }
#fetching the data based on id
@app.get("/products/{product_id}")
def get_product(product_id:int,db:Session=Depends(get_db),current_user:str=Depends(verify_token)):
    product=db.query(Product).filter(Product.id==product_id).first()
    if not product:
        raise HTTPException(status_code=404,detail="Product not found")
    return product
@app.put("/products/{product_id}")
def update_product(product_id:int,name:str,description:str,category:str,price:int,stock:int,db:Session=Depends(get_db),current_user:str=Depends(verify_token)):
    product=db.query(Product).filter(Product.id==product_id).first()
    if not product:
        raise HTTPException(status_code=404,detail="Product not found")
    product.name=name
    product.description=description
    product.category=category
    product.price=price
    product.stock=stock
    
    db.commit()
    db.refresh(product)
    return{"message":"product data is updated succssefully",
           "data":product}
# now applying delete operation 
@app.delete("/products/{product_id}")
def delete_product(product_id:int,db:Session=Depends(get_db),current_user:str=Depends(verify_token)):
    product=db.query(Product).filter(Product.id==product_id).first()
    if not product:
        raise HTTPException(status_code=404,detail="product not found")
    db.delete(product)
    db.commit()
    
    return{"message":"Product deleted"}
@app.post("/login")
def login(form_data:OAuth2PasswordRequestForm=Depends(),db:Session=Depends(get_db)):
    db_user=db.query(User).filter(User.username==form_data.username).first()
    if not db_user:
        raise HTTPException(status_code=401,detail="invalid username or password")
    if not verify_password(form_data.password,db_user.password):
        raise HTTPException(status_code=401,detail="invalid password or username")
    access_token=create_token({"sub":
        db_user.username})
    return {"access_token":access_token,"token_type":"bearer"}
@app.post("/register")
def register_user(user:UserCreate,db:Session=Depends(get_db)):
    hashed_password=hash_password(user.password)
    if db.query(User).filter(User.username==user.username).first():
        raise HTTPException(status_code=409, detail="Username already exists")
    new_user=User(username=user.username,password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return{"message":"user created successfully"}