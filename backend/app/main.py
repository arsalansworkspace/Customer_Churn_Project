from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from backend.app.database import test_connection
from backend.app.routers import auth_router, customers_router


app = FastAPI(
    title="ChurnGuard AI",
    description="Customer Intelligence and Churn Prediction Platform API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(customers_router)
app.include_router(auth_router)


# Root endpoint
@app.get("/", tags=["General"])
def root():
    return {
        "message": "Welcome to ChurnGuard AI API",
        "status": "running",
        "version": "1.0.0"
    }


# Health check endpoint
@app.get("/health", tags=["General"])
def health_check():
    try:
        database_result = test_connection()

        return {
            "status": "healthy",
            "application": "ChurnGuard AI",
            "database": "connected",
            "database_test": database_result
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "database": "disconnected"
            }
        )


