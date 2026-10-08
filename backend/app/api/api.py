from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.simulation import router as simulation_router
from app.api.houses import router as houses_router
from app.api.energy import router as energy_router
from app.api.trading import trades_router, trading_router
from app.api.blockchain import router as blockchain_router
from app.api.auth import router as auth_router
from app.api.security import router as security_router
from app.api.community import router as community_router
from app.api.admin import router as admin_router

api_router = APIRouter()

# Include sub-routers
api_router.include_router(health_router, tags=["Health"])
api_router.include_router(admin_router)
api_router.include_router(community_router)
api_router.include_router(auth_router)
api_router.include_router(security_router)
api_router.include_router(simulation_router)
api_router.include_router(houses_router)
api_router.include_router(energy_router)
api_router.include_router(trades_router)
api_router.include_router(trading_router)
api_router.include_router(blockchain_router)




