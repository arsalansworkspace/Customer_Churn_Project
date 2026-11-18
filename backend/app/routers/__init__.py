from backend.app.routers.auth import router as auth_router
from backend.app.routers.customers import router as customers_router
from backend.app.routers.predictions import router as predictions_router
from backend.app.routers.analytics import router as analytics_router
from backend.app.routers.retention import router as retention_router
from backend.app.routers.reports import router as reports_router

__all__ = [
    "auth_router",
    "customers_router",
    "predictions_router",
    "analytics_router",
    "retention_router",
    "reports_router",
]