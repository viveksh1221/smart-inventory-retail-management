from fastapi import FastAPI,Depends,HTTPException
from db import Base,engine,get_db
from sqlalchemy.orm import Session
from models import Product
from schemas import ProductCreate

app = FastAPI()
Base.metadata.create_all(bind=engine)

#now creating an api
@app.post("/products")
def post_product(products:ProductCreate,db:Session=Depends(get_db)):
    product=Product(name=products.name,description=products.description,category=products.category,price=products.price,stock=products.stock)
    db.add(product)
    db.commit()
    db.refresh
    return{"message":"data uploaded"}
@app.get("/products")
def get_products(db:Session=Depends(get_db)):
    products=db.query(Product).all()
    return{
        "total":len(products),
        "data":products
    }
#fetching the data based on id
@app.get("/products/{product_id}")
def get_product(product_id,db:Session=Depends(get_db)):
    product=db.query(Product).filter(Product.id==product_id).first()
    if not product:
        raise HTTPException(status_code=404,detail="Product not found")
    return product
@app.put("/products/{product_id}")
def update_product(product_id:int,name:str,description:str,category:str,price:int,stock:int,db:Session=Depends(get_db)):
    product=db.query(Product).filter(Product.id==product_id).first()
    if not product:
        raise HTTPException(status_code=404,detail="Product not found")
    product.name=name
    product.description=description
    product.category=category
    product.price=price
    product.stock=stock
    
    db.commit
    db.refresh(product)
    return{"message":"product data is updated succssefully",
           "data":product}