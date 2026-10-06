from jose import JWTError,jwt
from fastapi import HTTPException,Depends
from datetime import datetime,timedelta,timezone
from pwdlib import PasswordHash
from fastapi.security import OAuth2PasswordBearer,OAuth2PasswordRequestForm
import os
SECRET_KEY=os.getenv("SECRET_KEY","dev-only-secret")
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30

password_hash=PasswordHash.recommended()
oauth2_scheme=OAuth2PasswordBearer(tokenUrl="login")
def hash_password(password:str):
    return password_hash.hash(password)
def verify_password(password:str,hashed_password:str):
    return password_hash.verify(password,hashed_password)

#CREATING TOKEN
def create_token(data:dict):
    to_encode=data.copy()
    expire=datetime.now(timezone.utc)+timedelta(minutes=30)
    to_encode.update({
        "exp":expire
    })
    token=jwt.encode(to_encode,SECRET_KEY,algorithm=ALGORITHM)
    return token
#jwt token verification
def verify_token(token:str=Depends(oauth2_scheme)):
    try:
        payload=jwt.decode(token,SECRET_KEY,algorithms=[ALGORITHM])
        username=payload.get("sub")
        if username is None :
            raise HTTPException(status_code=401,detail="invalid token")
           
        return username
    except JWTError:
        raise HTTPException(status_code=401,detail="invalid or expired token")