from dataclasses import dataclass, field
from typing import List, Dict, Any
from trading.models import Trade, EnergyOffer, EnergyBid


@dataclass
class HouseholdAccount:
    """Financial and energy balance account for a single household."""
    household_id: str
    energy_sold_kwh: float = 0.0
    energy_bought_kwh: float = 0.0
    revenue_earned: float = 0.0
    expenditure_paid: float = 0.0

    @property
    def net_balance(self) -> float:
        """Net cashflow: positive means net income, negative means net cost."""
        return round(self.revenue_earned - self.expenditure_paid, 4)

    @property
    def net_energy_traded_kwh(self) -> float:
        """Net energy transferred through P2P market (kWh)."""
        return round(self.energy_sold_kwh - self.energy_bought_kwh, 4)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "household_id": self.household_id,
            "energy_sold_kwh": round(self.energy_sold_kwh, 4),
            "energy_bought_kwh": round(self.energy_bought_kwh, 4),
            "revenue_earned": round(self.revenue_earned, 4),
            "expenditure_paid": round(self.expenditure_paid, 4),
            "net_balance": self.net_balance,
            "net_energy_kwh": self.net_energy_traded_kwh,
        }


@dataclass
class SettlementSummary:
    """Aggregated financial and volume summary for a set of trades."""
    total_trades: int
    total_volume_kwh: float
    total_value: float
    average_price_per_kwh: float
    total_seller_revenue: float
    total_buyer_expenditure: float
    accounts: Dict[str, HouseholdAccount] = field(default_factory=dict)
    blockchain_blocks_created: int = 0
    blockchain_transactions_created: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_trades": self.total_trades,
            "total_volume_kwh": round(self.total_volume_kwh, 4),
            "total_value": round(self.total_value, 4),
            "average_price_per_kwh": round(self.average_price_per_kwh, 4),
            "total_seller_revenue": round(self.total_seller_revenue, 4),
            "total_buyer_expenditure": round(self.total_buyer_expenditure, 4),
            "accounts_count": len(self.accounts),
            "blockchain_blocks_created": self.blockchain_blocks_created,
            "blockchain_transactions_created": self.blockchain_transactions_created,
        }


class SettlementEngine:
    """Calculates settlement accounts, clearing turnover, and settles trades onto the blockchain ledger."""

    def __init__(self, blockchain: Any = None):
        self.accounts: Dict[str, HouseholdAccount] = {}
        self.trade_history: List[Trade] = []
        self.blockchain: Any = blockchain
        self.blocks_created: int = 0
        self.transactions_created: int = 0

    def validate_trade(self, trade: Trade) -> bool:
        """Validate the structural and numeric integrity of a P2P trade."""
        if not trade or not getattr(trade, "trade_id", None):
            return False
        if not trade.seller_id or not trade.buyer_id:
            return False
        if trade.seller_id == trade.buyer_id:
            return False
        if not getattr(trade, "community_id", None):
            return False
        if trade.energy_kwh <= 0 or trade.price_per_kwh < 0 or trade.total_value < 0:
            return False
        # Verify calculated total value consistency (within tolerance)
        expected_value = round(trade.energy_kwh * trade.price_per_kwh, 4)
        if abs(trade.total_value - expected_value) > 0.05:
            return False
        return True


    def get_or_create_account(self, household_id: str) -> HouseholdAccount:
        if household_id not in self.accounts:
            self.accounts[household_id] = HouseholdAccount(household_id=household_id)
        return self.accounts[household_id]

    def settle_single_trade(self, trade: Trade, blockchain: Any = None) -> Dict[str, Any]:
        """Settle a single trade following the 6-step blockchain ledger workflow:
        1. Validate the trade.
        2. Create a blockchain transaction.
        3. Add it to a pending transaction pool.
        4. Create a block according to the existing blockchain design.
        5. Store the block.
        6. Return the blockchain transaction/block reference.
        """
        # 1. Validate the trade
        if not self.validate_trade(trade):
            raise ValueError(f"Invalid trade for settlement: {trade.to_dict()}")

        self.trade_history.append(trade)

        seller_acc = self.get_or_create_account(trade.seller_id)
        seller_acc.energy_sold_kwh += trade.energy_kwh
        seller_acc.revenue_earned += trade.total_value

        buyer_acc = self.get_or_create_account(trade.buyer_id)
        buyer_acc.energy_bought_kwh += trade.energy_kwh
        buyer_acc.expenditure_paid += trade.total_value

        bc = blockchain or self.blockchain
        ref = None
        if bc is not None:
            # 2. Create a blockchain transaction
            from blockchain.transaction import Transaction
            tx = Transaction.from_trade(trade)
            # 3. Add it to a pending transaction pool
            bc.add_transaction(tx)
            # 4. Create a block according to the existing blockchain design
            # 5. Store the block (Blockchain.create_block appends it to chain)
            block = bc.create_block(timestamp=trade.timestamp)
            self.blocks_created += 1
            self.transactions_created += 1
            # 6. Return the blockchain transaction/block reference
            ref = {
                "trade_id": trade.trade_id,
                "tx_hash": tx.tx_hash,
                "block_index": block.index,
                "block_hash": block.hash,
                "previous_hash": block.previous_hash,
                "timestamp": block.timestamp,
                "status": "RECORDED_ON_CHAIN",
            }

        return {
            "trade": trade.to_dict(),
            "blockchain_ref": ref,
            "settled": True,
            "status": ref.get("status", "RECORDED_ON_CHAIN") if ref else "SETTLED",
            "trade_id": trade.trade_id,
        }

    def settle_trades(self, trades: List[Trade], blockchain: Any = None) -> SettlementSummary:
        """Process a list of executed trades, settle accounts, and commit onto the blockchain ledger.
        
        Args:
            trades: List of executed Trade objects.
            blockchain: Optional blockchain instance override.
            
        Returns:
            SettlementSummary: Summary of settlement metrics.
        """
        bc = blockchain or self.blockchain
        for trade in trades:
            if not self.validate_trade(trade):
                continue

            self.trade_history.append(trade)

            seller_acc = self.get_or_create_account(trade.seller_id)
            seller_acc.energy_sold_kwh += trade.energy_kwh
            seller_acc.revenue_earned += trade.total_value

            buyer_acc = self.get_or_create_account(trade.buyer_id)
            buyer_acc.energy_bought_kwh += trade.energy_kwh
            buyer_acc.expenditure_paid += trade.total_value

            if bc is not None:
                from blockchain.transaction import Transaction
                tx = Transaction.from_trade(trade)
                bc.add_transaction(tx)
                block = bc.create_block(timestamp=trade.timestamp)
                self.blocks_created += 1
                self.transactions_created += 1

        return self.get_summary()

    def get_summary(self) -> SettlementSummary:
        """Generate overall settlement summary."""
        total_volume = sum(t.energy_kwh for t in self.trade_history)
        total_val = sum(t.total_value for t in self.trade_history)
        avg_price = (total_val / total_volume) if total_volume > 0 else 0.0

        total_rev = sum(acc.revenue_earned for acc in self.accounts.values())
        total_exp = sum(acc.expenditure_paid for acc in self.accounts.values())

        return SettlementSummary(
            total_trades=len(self.trade_history),
            total_volume_kwh=round(total_volume, 4),
            total_value=round(total_val, 4),
            average_price_per_kwh=round(avg_price, 4),
            total_seller_revenue=round(total_rev, 4),
            total_buyer_expenditure=round(total_exp, 4),
            accounts=dict(self.accounts),
            blockchain_blocks_created=self.blocks_created,
            blockchain_transactions_created=self.transactions_created,
        )

    def reset(self) -> None:
        """Clear all accounts and settlement history."""
        self.accounts.clear()
        self.trade_history.clear()
        self.blocks_created = 0
        self.transactions_created = 0

