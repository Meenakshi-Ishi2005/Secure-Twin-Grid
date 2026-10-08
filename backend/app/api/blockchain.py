"""FastAPI Router for SecureTwinGrid Blockchain Endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.services.simulation_service import SimulationService, get_simulation_service
from app.schemas.blockchain import (
    BlockchainSummaryResponse,
    BlockListResponse,
    BlockResponse,
    ValidationResultResponse,
)

router = APIRouter(prefix="/blockchain", tags=["Blockchain"])


@router.get(
    "",
    response_model=BlockchainSummaryResponse,
    summary="Get Blockchain Overview",
    description="Retrieve high-level status, chain length, transaction count, latest block, and verification state.",
)
def get_blockchain_summary(
    service: SimulationService = Depends(get_simulation_service),
) -> BlockchainSummaryResponse:
    summary = service.get_blockchain_summary()
    return BlockchainSummaryResponse(**summary)


@router.get(
    "/blocks",
    response_model=BlockListResponse,
    summary="List All Blocks",
    description="Retrieve all blocks recorded on the SecureTwinGrid blockchain ledger, including transactions and hash links.",
)
def list_blocks(
    service: SimulationService = Depends(get_simulation_service),
) -> BlockListResponse:
    blocks = service.get_blockchain_blocks()
    total_txs = sum(len(b.get("transactions", [])) for b in blocks)
    return BlockListResponse(
        total_blocks=len(blocks),
        total_transactions=total_txs,
        blocks=[BlockResponse(**b) for b in blocks],
    )


@router.get(
    "/blocks/{index}",
    response_model=BlockResponse,
    summary="Get Block by Index",
    description="Retrieve full details and transactions for a specific block by sequential index.",
    responses={
        404: {"description": "Block not found on chain"}
    },
)
def get_block(
    index: int,
    service: SimulationService = Depends(get_simulation_service),
) -> BlockResponse:
    block = service.get_blockchain_block(index)
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Block with index {index} was not found on the blockchain ledger.",
        )
    return BlockResponse(**block)


@router.get(
    "/validate",
    response_model=ValidationResultResponse,
    summary="Validate Blockchain Cryptographic Integrity",
    description="Audit the entire blockchain for parent hash linkage, SHA-256 block hash integrity, and transaction tampering.",
)
def validate_blockchain(
    service: SimulationService = Depends(get_simulation_service),
) -> ValidationResultResponse:
    audit_report = service.validate_blockchain()
    return ValidationResultResponse(**audit_report)
