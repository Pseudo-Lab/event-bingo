"""
공용 Depends 모음
"""
from typing import Annotated
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.db import db
import os
from fastapi.security import HTTPBasic, HTTPBasicCredentials


AsyncSessionDepends = Annotated[AsyncSession, Depends(db.get_session)]


# Swagger/Admin Auth
SWAGGER_USERNAME = os.environ.get("SWAGGER_USERNAME", "admin")
SWAGGER_PASSWORD = os.environ.get("SWAGGER_PASSWORD", "admin")

security = HTTPBasic()

def authenticate_user(credentials: Annotated[HTTPBasicCredentials, Depends(security)]):
    if credentials.username != SWAGGER_USERNAME or credentials.password != SWAGGER_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
