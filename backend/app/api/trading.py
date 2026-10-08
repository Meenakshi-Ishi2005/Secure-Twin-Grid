from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.services.simulation_service import SimulationService, get_simulation_service
from app.schemas.trading import (
    TradeResponse,
    TradeListResponse,
    TradingRunRequest,
    TradingRunResponse,
)

trades_router = APIRouter(prefix="/trades", tags=["Trades"])
trading_router = APIRouter(prefix="/trading", tags=["Trading"])


@trades_router.get(
    "",
    response_model=TradeListResponse,
    summary="List P2P Trades",
    description="Retrieve all executed peer-to-peer electricity trades, with optional filtering by seller/buyer and pagination.",
)
def list_trades(
    seller_id: Optional[str] = Query(None, description="Filter trades by seller household ID"),
    buyer_id: Optional[str] = Query(None, description="Filter trades by buyer household ID"),
    limit: int = Query(default=100, ge=1, le=1000, description="Max trades to return"),
    offset: int = Query(default=0, ge=0, description="Number of trades to skip"),
    service: SimulationService = Depends(get_simulation_service),
) -> TradeListResponse:
    paginated_trades, total_count, total_vol, total_val = service.get_trades(
        limit=limit,
        offset=offset,
        seller_id=seller_id,
        buyer_id=buyer_id,
    )
    items = [TradeResponse(**t.to_dict()) for t in paginated_trades]
    return TradeListResponse(
        total_count=total_count,
        total_volume_kwh=total_vol,
        total_value=total_val,
        trades=items,
    )


@trades_router.get(
    "/{trade_id}",
    response_model=TradeResponse,
    summary="Get Trade by ID",
    description="Retrieve execution details, volume, clearing price, and participants for a single trade transaction.",
    responses={
        404: {"description": "Trade not found"}
    },
)
def get_trade(
    trade_id: str,
    service: SimulationService = Depends(get_simulation_service),
) -> TradeResponse:
    trade = service.get_trade(trade_id)
    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trade transaction with ID '{trade_id}' was not found.",
        )
    return TradeResponse(**trade.to_dict())


@trading_router.post(
    "/run",
    response_model=TradingRunResponse,
    summary="Run P2P Trading Auction",
    description="Execute a double-auction matching round on the current household surplus and deficit balances.",
)
def run_trading(
    request: TradingRunRequest = TradingRunRequest(),
    service: SimulationService = Depends(get_simulation_service),
) -> TradingRunResponse:
    new_trades = service.run_trading_round(
        default_seller_ask=request.default_seller_ask or 0.10,
        default_buyer_bid=request.default_buyer_bid or 0.18,
        price_noise=request.price_noise or False,
    )
    total_vol = round(sum(t.energy_kwh for t in new_trades), 4)
    total_val = round(sum(t.total_value for t in new_trades), 4)
    avg_price = round(total_val / total_vol, 4) if total_vol > 0 else 0.0

    items = [TradeResponse(**t.to_dict()) for t in new_trades]
    return TradingRunResponse(
        message=f"Auction executed successfully with {len(new_trades)} trade(s) cleared.",
        trades_executed=len(new_trades),
        volume_kwh=total_vol,
        total_value=total_val,
        average_price_per_kwh=avg_price,
        trades=items,
    )
