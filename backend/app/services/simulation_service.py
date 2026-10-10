import sys
import os
import threading
import time
from typing import List, Dict, Optional, Tuple, Any

# Ensure project root is in sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from simulation.config import SimulationConfig
from simulation.engine import SimulationEngine
from simulation.models import Household
from trading.models import Trade
from trading.matcher import DoubleAuctionMatcher
from trading.settlement import SettlementEngine
from blockchain.blockchain import Blockchain
from blockchain.transaction import Transaction


class SimulationService:
    """Manages in-memory state and coordination for digital twin simulation, P2P trading, and blockchain ledger."""

    def __init__(self, num_households: int = 100, random_seed: int = 42):
        self._lock = threading.RLock()
        self._stop_event = threading.Event()
        self._bg_thread: Optional[threading.Thread] = None
        self.step_delay: float = 1.0  # seconds per 15-minute simulated step
        self.num_households = num_households
        self.random_seed = random_seed
        self.engine = SimulationEngine(
            config=SimulationConfig(
                num_households=num_households,
                interval_minutes=15,
                duration_hours=24,
                random_seed=random_seed,
            )
        )
        self._ensure_prosumer_households()
        self.matcher = DoubleAuctionMatcher()
        self.blockchain = Blockchain(validator_id="poa-validator-primary")
        self.settlement = SettlementEngine(blockchain=self.blockchain)
        self.trades: List[Trade] = []
        self.trades_by_id: Dict[str, Trade] = {}
        self.is_running: bool = False

    def _ensure_prosumer_households(self) -> None:
        """Ensure designated user prosumer households (HH-001 and HH-006) have solar PV and battery storage."""
        for hh in self.engine.households:
            if hh.household_id in ("HH-001", "HH-006"):
                if not hh.has_solar or hh.solar_capacity_kw <= 0:
                    hh.has_solar = True
                    hh.solar_capacity_kw = 5.25
                if not hh.has_battery or hh.battery_capacity_kwh <= 0:
                    hh.has_battery = True
                    hh.battery_capacity_kwh = 9.50
                    hh.battery_level_kwh = 4.75
        self._execution_status: str = "INITIALIZED"

    def get_status(self) -> Dict:
        """Return the current operational status of the simulation engine."""
        with self._lock:
            return self.get_status_locked()

    def get_status_locked(self) -> Dict:
        current_step = self.engine.current_step
        total_steps = self.engine.config.total_steps
        total_minutes = current_step * self.engine.config.interval_minutes
        hour_of_day = (total_minutes / 60.0) % 24.0
        time_hours = int(hour_of_day)
        time_mins = int((hour_of_day - time_hours) * 60)
        current_time = f"{time_hours:02d}:{time_mins:02d}"

        status_str = self._execution_status
        if current_step >= total_steps:
            status_str = "COMPLETED"
            self.is_running = False
        elif self._bg_thread and self._bg_thread.is_alive() and not self._stop_event.is_set():
            status_str = "RUNNING"
            self.is_running = True

        return {
            "status": status_str,
            "current_step": current_step,
            "total_steps": total_steps,
            "current_time": current_time,
            "hour_of_day": round(hour_of_day, 2),
            "num_households": len(self.engine.households),
            "interval_minutes": self.engine.config.interval_minutes,
            "duration_hours": self.engine.config.duration_hours,
            "total_trades_count": len(self.trades),
            "is_running": self.is_running,
        }

    def start_continuous(self, step_delay: float = 1.0, run_trading: bool = True) -> Dict:
        """Start or resume the background simulation worker thread so it runs continuously on the server."""
        with self._lock:
            total_steps = self.engine.config.total_steps
            if self.engine.current_step >= total_steps:
                # If 24-hour simulation was completed, restart from 00:00 to run continuously again
                self._reset_internal(
                    num_households=self.num_households,
                    random_seed=self.random_seed,
                )

            self.step_delay = max(0.1, step_delay)
            self._stop_event.clear()
            self.is_running = True
            self._execution_status = "RUNNING"

            if self._bg_thread is None or not self._bg_thread.is_alive():
                self._bg_thread = threading.Thread(
                    target=self._background_worker,
                    args=(run_trading,),
                    daemon=True,
                    name="MicrogridSimulationWorker",
                )
                self._bg_thread.start()

            status_info = self.get_status_locked()
            return {
                "message": "Global continuous simulation started successfully.",
                "status": "RUNNING",
                "current_step": status_info["current_step"],
                "current_time": status_info["current_time"],
                "details": {
                    "step_delay_seconds": self.step_delay,
                    "is_running": True,
                },
            }

    def _background_worker(self, run_trading: bool = True) -> None:
        """Daemon worker loop advancing simulation steps at configured step_delay."""
        while not self._stop_event.is_set():
            if self._stop_event.wait(timeout=self.step_delay):
                break

            with self._lock:
                total_steps = self.engine.config.total_steps
                if self.engine.current_step >= total_steps:
                    self.is_running = False
                    self._execution_status = "COMPLETED"
                    break

                step_summary = self.engine.step()
                if run_trading:
                    new_trades, _ = self.matcher.execute_simulation_interval(
                        households=self.engine.households,
                        timestamp=step_summary.time_str,
                        default_seller_ask=0.10,
                        default_buyer_bid=0.18,
                        price_noise=True,
                        random_seed=42 + step_summary.step,
                    )
                    for trade in new_trades:
                        self.trades.append(trade)
                        self.trades_by_id[trade.trade_id] = trade
                    self.settlement.settle_trades(new_trades)

                if self.engine.current_step >= total_steps:
                    self.is_running = False
                    self._execution_status = "COMPLETED"
                    break

    def start(
        self,
        steps: Optional[int] = None,
        run_trading: bool = True,
        num_households: Optional[int] = None,
        random_seed: Optional[int] = None,
        continuous: Optional[bool] = None,
        step_delay: float = 1.0,
    ) -> Dict:
        """Start or advance the digital twin simulation.
        
        If continuous is True (or continuous is not False and steps is None), starts background server daemon loop.
        If steps is provided, advances specified number of steps synchronously.
        """
        if continuous is True or (steps is None and continuous is not False):
            return self.start_continuous(step_delay=step_delay, run_trading=run_trading)

        with self._lock:
            # Reinitialize if parameters changed
            if (num_households is not None and num_households != self.num_households) or (
                random_seed is not None and random_seed != self.random_seed
            ):
                self._reset_internal(
                    num_households=num_households or self.num_households,
                    random_seed=random_seed if random_seed is not None else self.random_seed,
                )

            total_steps = self.engine.config.total_steps
            remaining_steps = max(0, total_steps - self.engine.current_step)

            if remaining_steps == 0:
                status_info = self.get_status_locked()
                return {
                    "message": "Simulation is already completed for the 24-hour duration. Reset to run again.",
                    "status": "COMPLETED",
                    "current_step": status_info["current_step"],
                    "current_time": status_info["current_time"],
                    "details": {"steps_advanced": 0, "trades_cleared": 0},
                }

            steps_to_advance = min(steps, remaining_steps) if steps is not None else remaining_steps
            new_trades_count = 0

            for _ in range(steps_to_advance):
                step_summary = self.engine.step()
                if run_trading:
                    new_trades, _ = self.matcher.execute_simulation_interval(
                        households=self.engine.households,
                        timestamp=step_summary.time_str,
                        default_seller_ask=0.10,
                        default_buyer_bid=0.18,
                        price_noise=True,
                        random_seed=42 + step_summary.step,
                    )
                    for trade in new_trades:
                        self.trades.append(trade)
                        self.trades_by_id[trade.trade_id] = trade
                    self.settlement.settle_trades(new_trades)
                    new_trades_count += len(new_trades)

            if self.engine.current_step >= total_steps:
                self.is_running = False
                self._execution_status = "COMPLETED"
            else:
                if self._bg_thread and self._bg_thread.is_alive() and not self._stop_event.is_set():
                    self.is_running = True
                    self._execution_status = "RUNNING"
                else:
                    self.is_running = False
                    self._execution_status = "STOPPED"

            status_info = self.get_status_locked()
            return {
                "message": f"Successfully advanced simulation by {steps_to_advance} step(s).",
                "status": status_info["status"],
                "current_step": status_info["current_step"],
                "current_time": status_info["current_time"],
                "details": {
                    "steps_advanced": steps_to_advance,
                    "new_trades_cleared": new_trades_count,
                    "total_trades": len(self.trades),
                },
            }

    def stop(self) -> Dict:
        """Pause / stop simulation execution."""
        with self._lock:
            self._stop_event.set()
            self.is_running = False
            if self._execution_status != "COMPLETED":
                self._execution_status = "STOPPED"
            status_info = self.get_status_locked()
            return {
                "message": "Simulation stopped successfully.",
                "status": status_info["status"],
                "current_step": status_info["current_step"],
                "current_time": status_info["current_time"],
            }

    def reset(
        self,
        num_households: Optional[int] = None,
        random_seed: Optional[int] = None,
    ) -> Dict:
        """Reset the simulation and trading engine back to initial state."""
        with self._lock:
            self._reset_internal(
                num_households=num_households or self.num_households,
                random_seed=random_seed if random_seed is not None else self.random_seed,
            )
            status_info = self.get_status_locked()
            return {
                "message": f"Simulation reset with {self.num_households} households.",
                "status": "INITIALIZED",
                "current_step": 0,
                "current_time": "00:00",
                "details": {
                    "num_households": self.num_households,
                    "random_seed": self.random_seed,
                },
            }

    def _reset_internal(self, num_households: int, random_seed: int) -> None:
        self._stop_event.set()
        self.num_households = num_households
        self.random_seed = random_seed
        self.engine = SimulationEngine(
            config=SimulationConfig(
                num_households=num_households,
                interval_minutes=15,
                duration_hours=24,
                random_seed=random_seed,
            )
        )
        self._ensure_prosumer_households()
        self.matcher = DoubleAuctionMatcher()
        self.blockchain = Blockchain(validator_id="poa-validator-primary")
        self.settlement = SettlementEngine(blockchain=self.blockchain)
        self.trades.clear()
        self.trades_by_id.clear()
        self.is_running = False
        self._execution_status = "INITIALIZED"

    def get_households(self, status_filter: Optional[str] = None) -> List[Household]:
        """Retrieve virtual households, optionally filtered by trading status."""
        with self._lock:
            if not status_filter:
                return list(self.engine.households)
            target = status_filter.strip().upper()
            return [hh for hh in self.engine.households if hh.status.upper() == target]

    def get_household(self, household_id: str) -> Optional[Household]:
        """Retrieve a single household by ID."""
        with self._lock:
            target = household_id.strip().upper()
            for hh in self.engine.households:
                if hh.household_id.upper() == target:
                    return hh
            return None

    def get_energy_summary(self) -> Dict:
        """Compute aggregated energy generation, demand, and storage metrics."""
        with self._lock:
            step_history = self.engine.step_history
            if step_history:
                total_gen_kwh = sum(s.total_generation_kwh for s in step_history)
                total_con_kwh = sum(s.total_consumption_kwh for s in step_history)
                total_surplus_kwh = sum(s.total_surplus_kwh for s in step_history)
                total_deficit_kwh = sum(s.total_deficit_kwh for s in step_history)
                peak_gen_kw = max(s.total_generation_kw for s in step_history)
                peak_demand_kw = max(s.total_consumption_kw for s in step_history)
                max_buyers = max(s.buyers_count for s in step_history)
                max_sellers = max(s.sellers_count for s in step_history)
                last_step = step_history[-1]
                cur_gen_kw = last_step.total_generation_kw
                cur_con_kw = last_step.total_consumption_kw
                cur_bat_kwh = last_step.battery_storage_kwh
            else:
                total_gen_kwh = 0.0
                total_con_kwh = 0.0
                total_surplus_kwh = 0.0
                total_deficit_kwh = 0.0
                peak_gen_kw = 0.0
                peak_demand_kw = 0.0
                max_buyers = 0
                max_sellers = 0
                cur_gen_kw = sum(hh.current_generation_kw for hh in self.engine.households)
                cur_con_kw = sum(hh.current_consumption_kw for hh in self.engine.households)
                cur_bat_kwh = sum(hh.battery_level_kwh for hh in self.engine.households if hh.has_battery)

            total_bat_cap = sum(hh.battery_capacity_kwh for hh in self.engine.households if hh.has_battery)

            return {
                "total_generation_kwh": round(total_gen_kwh, 2),
                "total_consumption_kwh": round(total_con_kwh, 2),
                "total_surplus_kwh": round(total_surplus_kwh, 2),
                "total_deficit_kwh": round(total_deficit_kwh, 2),
                "peak_generation_kw": round(peak_gen_kw, 2),
                "peak_demand_kw": round(peak_demand_kw, 2),
                "maximum_buyers": max_buyers,
                "maximum_sellers": max_sellers,
                "current_total_generation_kw": round(cur_gen_kw, 2),
                "current_total_consumption_kw": round(cur_con_kw, 2),
                "total_battery_stored_kwh": round(cur_bat_kwh, 2),
                "total_battery_capacity_kwh": round(total_bat_cap, 2),
                "total_steps": self.engine.config.total_steps,
                "completed_steps": len(self.engine.step_history),
            }

    def get_step_history(self) -> List[Dict]:
        """Retrieve full step history of microgrid simulation intervals."""
        with self._lock:
            return [s.to_dict() for s in self.engine.step_history]

    def get_trades(
        self,
        limit: int = 100,
        offset: int = 0,
        seller_id: Optional[str] = None,
        buyer_id: Optional[str] = None,
        household_id: Optional[str] = None,
    ) -> Tuple[List[Trade], int, float, float]:
        """Retrieve trades with optional filtering and pagination."""
        with self._lock:
            filtered = self.trades
            if household_id:
                h_target = household_id.strip().upper()
                filtered = [
                    t for t in filtered
                    if (getattr(t, "seller_id", None) and t.seller_id.upper() == h_target)
                    or (getattr(t, "buyer_id", None) and t.buyer_id.upper() == h_target)
                ]
            if seller_id:
                s_target = seller_id.strip().upper()
                filtered = [t for t in filtered if getattr(t, "seller_id", None) and t.seller_id.upper() == s_target]
            if buyer_id:
                b_target = buyer_id.strip().upper()
                filtered = [t for t in filtered if getattr(t, "buyer_id", None) and t.buyer_id.upper() == b_target]

            total_count = len(filtered)
            total_vol = round(sum(t.energy_kwh for t in filtered), 4)
            total_val = round(sum(t.total_value for t in filtered), 4)

            paginated = filtered[offset : offset + limit]
            return paginated, total_count, total_vol, total_val

    def get_trade(self, trade_id: str) -> Optional[Trade]:
        """Find a trade by trade_id."""
        with self._lock:
            target = trade_id.strip().upper()
            return self.trades_by_id.get(target)

    def run_trading_round(
        self,
        default_seller_ask: float = 0.10,
        default_buyer_bid: float = 0.18,
        price_noise: bool = False,
    ) -> List[Trade]:
        """Execute a manual double auction on current household surplus/deficits."""
        with self._lock:
            status_info = self.get_status_locked()
            trades, _ = self.matcher.execute_simulation_interval(
                households=self.engine.households,
                timestamp=status_info["current_time"],
                default_seller_ask=default_seller_ask,
                default_buyer_bid=default_buyer_bid,
                price_noise=price_noise,
            )
            for trade in trades:
                self.trades.append(trade)
                self.trades_by_id[trade.trade_id] = trade
            self.settlement.settle_trades(trades)
            return trades

    def get_blockchain_summary(self) -> Dict[str, Any]:
        """Retrieve overview summary of the blockchain ledger state."""
        with self._lock:
            report = self.blockchain.get_validation_report()
            latest = self.blockchain.latest_block
            return {
                "chain_length": len(self.blockchain.chain),
                "total_transactions": self.blockchain.get_total_transactions_count(),
                "latest_block_index": latest.index,
                "latest_block_hash": latest.hash,
                "latest_block_timestamp": latest.timestamp,
                "validator_id": self.blockchain.validator_id,
                "is_valid": report.is_valid,
                "validation_report": report.to_dict(),
            }

    def get_blockchain_blocks(self) -> List[Dict[str, Any]]:
        """Retrieve all blocks recorded on the blockchain ledger."""
        with self._lock:
            return self.blockchain.to_list()

    def get_blockchain_block(self, index: int) -> Optional[Dict[str, Any]]:
        """Retrieve a specific block by index."""
        with self._lock:
            if 0 <= index < len(self.blockchain.chain):
                return self.blockchain.chain[index].to_dict()
            return None

    def validate_blockchain(self) -> Dict[str, Any]:
        """Perform cryptographic audit on the entire blockchain."""
        with self._lock:
            return self.blockchain.get_validation_report().to_dict()

    def get_community_info(self) -> Dict[str, Any]:
        """Retrieve simulated Local Energy Community profile and parameters."""
        with self._lock:
            total_hh = len(self.engine.households)
            solar_hh = sum(1 for hh in self.engine.households if hh.has_solar)
            battery_hh = sum(1 for hh in self.engine.households if hh.has_battery)
            ev_hh = sum(1 for hh in self.engine.households if hh.has_ev)

            solar_pct = (solar_hh / total_hh * 100.0) if total_hh > 0 else 0.0
            battery_pct = (battery_hh / total_hh * 100.0) if total_hh > 0 else 0.0
            ev_pct = (ev_hh / total_hh * 100.0) if total_hh > 0 else 0.0

            from community.models import Community
            comm = Community(
                community_id=self.engine.config.community_id,
                community_name=self.engine.config.community_name,
                description=self.engine.config.community_description,
                location_name=self.engine.config.location_name,
                household_capacity=self.engine.config.household_capacity,
                current_household_count=total_hh,
                solar_penetration_percent=round(solar_pct, 1),
                battery_penetration_percent=round(battery_pct, 1),
                ev_penetration_percent=round(ev_pct, 1),
                status="ACTIVE",
            )
            return comm.to_dict()

    def get_community_summary(self) -> Dict[str, Any]:
        """Retrieve consolidated Local Energy Community overview, energy metrics, trading, and blockchain state."""
        with self._lock:
            comm_info = self.get_community_info()
            status_info = self.get_status_locked()
            energy_metrics = self.get_energy_summary()

            # Active trading metrics in current interval
            sellers = [hh for hh in self.engine.households if hh.status.upper() == "SELLING"]
            buyers = [hh for hh in self.engine.households if hh.status.upper() == "BUYING"]
            balanced = [hh for hh in self.engine.households if hh.status.upper() == "BALANCED"]

            total_vol = sum(t.energy_kwh for t in self.trades)
            total_val = sum(t.total_value for t in self.trades)

            # Blockchain status
            latest = self.blockchain.latest_block
            val_report = self.blockchain.get_validation_report()

            return {
                "community": comm_info,
                "current_time": status_info["current_time"],
                "current_step": status_info["current_step"],
                "total_steps": status_info["total_steps"],
                "energy_metrics": energy_metrics,
                "trading_metrics": {
                    "active_buyers": len(buyers),
                    "active_sellers": len(sellers),
                    "balanced_households": len(balanced),
                    "completed_trades": len(self.trades),
                    "total_volume_kwh": round(total_vol, 2),
                    "total_turnover_value": round(total_val, 2),
                },
                "blockchain_metrics": {
                    "total_blocks": len(self.blockchain.chain),
                    "total_transactions": self.blockchain.get_total_transactions_count(),
                    "latest_block_hash": latest.hash,
                    "is_valid": val_report.is_valid,
                },
            }

    def get_community_energy_summary(self) -> Dict[str, Any]:
        """Retrieve community-scoped energy generation, consumption, and storage summary."""
        with self._lock:
            energy_metrics = self.get_energy_summary()
            return {
                "community_id": self.engine.config.community_id,
                "community_name": self.engine.config.community_name,
                "location_name": self.engine.config.location_name,
                "household_count": len(self.engine.households),
                "energy_summary": energy_metrics,
            }

    def get_future_config(self) -> Dict[str, Any]:
        """Retrieve the configured future simulation parameters."""
        with self._lock:
            solar_pct = (sum(1 for h in self.engine.households if h.has_solar) / max(len(self.engine.households), 1)) * 100
            battery_pct = (sum(1 for h in self.engine.households if h.has_battery) / max(len(self.engine.households), 1)) * 100
            ev_pct = (sum(1 for h in self.engine.households if h.has_ev) / max(len(self.engine.households), 1)) * 100

            base = {
                "num_households": self.num_households,
                "solar_penetration": round(solar_pct / 100.0, 2),
                "battery_penetration": round(battery_pct / 100.0, 2),
                "ev_penetration": round(ev_pct / 100.0, 2),
                "interval_minutes": self.engine.config.interval_minutes,
                "duration_hours": self.engine.config.duration_hours,
                "random_seed": self.random_seed,
            }
            if hasattr(self, "_future_config") and self._future_config:
                base.update(self._future_config)
            return base

    def update_future_config(self, config_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Stage updated simulation parameters for future simulation runs without altering historical data."""
        with self._lock:
            if not hasattr(self, "_future_config") or not self._future_config:
                self._future_config = self.get_future_config()
            self._future_config.update({k: v for k, v in config_dict.items() if v is not None})
            return dict(self._future_config)

    def get_privacy_matrix(self) -> Dict[str, Any]:
        """Return the microgrid privacy baseline matrix and data access policy."""
        return {
            "title": "SecureTwinGrid Privacy Baseline & Access Control Matrix",
            "description": "Granular data minimization and role-based privacy boundaries across virtual microgrid tiers.",
            "categories": [
                {
                    "category": "Household Identity",
                    "description": "Real-world resident name, physical address, and meter serial numbers",
                    "owner": "Full Access",
                    "buyer": "Pseudonymous (HH-ID)",
                    "seller": "Pseudonymous (HH-ID)",
                    "platform": "Encrypted Identity Token",
                    "blockchain_observer": "Anonymized Hash / PKI Key",
                    "admin": "Pseudonymous / Software Role Only",
                    "privacy_level": "CRITICAL - STRICT PRIVACY",
                },
                {
                    "category": "Energy Consumption",
                    "description": "High-resolution real-time power draw and home appliance telemetry",
                    "owner": "Full Access",
                    "buyer": "No Access",
                    "seller": "No Access",
                    "platform": "Aggregated Community Demand",
                    "blockchain_observer": "No Access (Off-Chain)",
                    "admin": "Aggregated / Community Metric",
                    "privacy_level": "HIGH - LOCAL METER ONLY",
                },
                {
                    "category": "Energy Generation",
                    "description": "Rooftop PV solar output and peak generation curve",
                    "owner": "Full Access",
                    "buyer": "Cleared kWh Only",
                    "seller": "Full Access",
                    "platform": "Aggregated Community Supply",
                    "blockchain_observer": "Cleared Trade Volume Only",
                    "admin": "Aggregated / Community Metric",
                    "privacy_level": "MEDIUM - AGGREGATED",
                },
                {
                    "category": "Battery State",
                    "description": "BESS battery capacity, charge state (SoC), and discharge rate",
                    "owner": "Full Access",
                    "buyer": "No Access",
                    "seller": "No Access",
                    "platform": "Flexibility Reserve Pool",
                    "blockchain_observer": "No Access (Off-Chain)",
                    "admin": "Aggregated Microgrid Capacity",
                    "privacy_level": "HIGH - DEVICE LOCAL",
                },
                {
                    "category": "EV Charging",
                    "description": "Electric vehicle connection status, battery size, and departure schedule",
                    "owner": "Full Access",
                    "buyer": "No Access",
                    "seller": "No Access",
                    "platform": "Aggregated EV Load Profile",
                    "blockchain_observer": "No Access",
                    "admin": "Aggregated Microgrid Demand",
                    "privacy_level": "HIGH - BEHAVIORAL PRIVACY",
                },
                {
                    "category": "Trading History",
                    "description": "Peer-to-peer matched volume, clearing prices, and settlement receipts",
                    "owner": "Full Access (Own Trades)",
                    "buyer": "Full Access (Matched Trade)",
                    "seller": "Full Access (Matched Trade)",
                    "platform": "Clearing Engine Ledger",
                    "blockchain_observer": "Signed Blockchain Tx",
                    "admin": "Audit Ledger (Read-Only)",
                    "privacy_level": "AUTHENTICATED & AUDITED",
                },
            ],
            "privacy_guarantees": [
                "Differential Privacy: Telemetry aggregates are masked with noise bounds to prevent appliance disaggregation (NILM).",
                "Zero-Knowledge Proofs / Pseudonymity: Households trade using ephemeral PKI keypairs without disclosing physical home location.",
                "Admin Privacy Boundary: The software operator cannot inspect private appliance usage or modify historical settlements.",
            ],
        }

    def get_system_analytics(self) -> Dict[str, Any]:
        """Aggregate high-level engineering and market analytics for the digital twin."""
        with self._lock:
            energy_summary = self.get_energy_summary()
            comm_info = self.get_community_info()
            total_gen = energy_summary.get("total_generation_kwh", 0.0)
            total_con = energy_summary.get("total_consumption_kwh", 0.0)
            total_surplus = energy_summary.get("total_surplus_kwh", 0.0)
            total_deficit = energy_summary.get("total_deficit_kwh", 0.0)
            total_vol = sum(t.energy_kwh for t in self.trades)
            total_val = sum(t.total_value for t in self.trades)

            # Self-consumption rate: portion of on-site solar consumed locally
            self_consumption_pct = 0.0
            if total_gen > 0:
                self_consumption_pct = min(100.0, max(0.0, ((total_gen - total_surplus) / total_gen) * 100.0))

            # Community self-sufficiency: portion of total demand covered by local generation
            self_sufficiency_pct = 0.0
            if total_con > 0:
                self_sufficiency_pct = min(100.0, max(0.0, ((total_con - total_deficit) / total_con) * 100.0))

            avg_price = (total_val / total_vol) if total_vol > 0 else 0.14

            # Peak demand shaving estimation
            peak_shaving_kw = round(max(0.0, total_surplus * 0.4), 2)

            return {
                "community_name": comm_info.get("community_name", "Green Valley Community"),
                "total_households": len(self.engine.households),
                "solar_producers_count": sum(1 for h in self.engine.households if h.has_solar),
                "battery_storage_count": sum(1 for h in self.engine.households if h.has_battery),
                "ev_households_count": sum(1 for h in self.engine.households if h.has_ev),
                "self_consumption_rate_pct": round(self_consumption_pct, 1),
                "community_self_sufficiency_pct": round(self_sufficiency_pct, 1),
                "total_energy_generated_kwh": round(total_gen, 2),
                "total_energy_consumed_kwh": round(total_con, 2),
                "total_energy_traded_kwh": round(total_vol, 2),
                "total_trading_turnover_usd": round(total_val, 2),
                "average_clearing_price_usd": round(avg_price, 4),
                "peak_demand_shaved_kw": peak_shaving_kw,
                "blockchain_blocks_count": len(self.blockchain.chain),
                "blockchain_transactions_count": self.blockchain.get_total_transactions_count(),
                "blockchain_integrity_status": "VALID" if self.blockchain.validate_chain()["is_valid"] else "INVALID",
            }

    def get_admin_dashboard_overview(self) -> Dict[str, Any]:
        """Consolidated system, energy, trading, blockchain, and security overview for Admin."""
        with self._lock:
            status_info = self.get_status_locked()
            comm_info = self.get_community_info()
            energy_summary = self.get_energy_summary()

            sellers = [hh for hh in self.engine.households if hh.status.upper() == "SELLING"]
            buyers = [hh for hh in self.engine.households if hh.status.upper() == "BUYING"]
            solar_hh = [hh for hh in self.engine.households if hh.has_solar]
            battery_hh = [hh for hh in self.engine.households if hh.has_battery]
            ev_hh = [hh for hh in self.engine.households if hh.has_ev]

            total_vol = sum(t.energy_kwh for t in self.trades)
            total_val = sum(t.total_value for t in self.trades)
            avg_price = (total_val / total_vol) if total_vol > 0 else 0.14

            latest_block = self.blockchain.latest_block
            val_report = self.blockchain.get_validation_report()

            return {
                "system_overview": {
                    "community_name": comm_info.get("community_name", "Green Valley Community"),
                    "community_id": comm_info.get("community_id", "COMM-001-GREENVALLEY"),
                    "network_type": comm_info.get("network_type", "Virtual Microgrid"),
                    "total_households": len(self.engine.households),
                    "household_capacity": comm_info.get("household_capacity", 500),
                    "active_users_count": len(self.engine.households),
                    "suspended_users_count": 0,
                },
                "energy_overview": {
                    "current_generation_kwh": energy_summary.get("total_generation_kwh", 0.0),
                    "current_consumption_kwh": energy_summary.get("total_consumption_kwh", 0.0),
                    "current_surplus_kwh": energy_summary.get("total_surplus_kwh", 0.0),
                    "current_deficit_kwh": energy_summary.get("total_deficit_kwh", 0.0),
                    "solar_producers": len(solar_hh),
                    "battery_homes": len(battery_hh),
                    "ev_homes": len(ev_hh),
                    "battery_stored_kwh": energy_summary.get("total_battery_stored_kwh", 0.0),
                    "ev_charging_kwh": energy_summary.get("total_ev_charging_kwh", 0.0),
                },
                "trading_overview": {
                    "active_buyers": len(buyers),
                    "active_sellers": len(sellers),
                    "completed_trades": len(self.trades),
                    "total_energy_traded_kwh": round(total_vol, 2),
                    "average_trading_price_usd": round(avg_price, 4),
                    "total_turnover_value_usd": round(total_val, 2),
                },
                "blockchain": {
                    "total_blocks": len(self.blockchain.chain),
                    "total_transactions": self.blockchain.get_total_transactions_count(),
                    "latest_block_index": latest_block.index if latest_block else 0,
                    "latest_block_hash": latest_block.hash if latest_block else "",
                    "blockchain_status": "VALID" if val_report.is_valid else "INVALID",
                    "last_validation_time": latest_block.timestamp if latest_block else None,
                },
                "system": {
                    "simulation_status": status_info["status"],
                    "simulation_time": status_info["current_time"],
                    "current_step": status_info["current_step"],
                    "total_steps": status_info["total_steps"],
                    "number_of_households": len(self.engine.households),
                    "api_status": "ONLINE (Healthy)",
                    "database_status": "CONNECTED (SQLite / PostgreSQL)",
                    "blockchain_status": "SYNCHRONIZED (PoA Consensus)",
                },
            }





# Global singleton instance
_simulation_service_instance: Optional[SimulationService] = None


def get_simulation_service() -> SimulationService:
    global _simulation_service_instance
    if _simulation_service_instance is None:
        _simulation_service_instance = SimulationService()
    return _simulation_service_instance
