"""Configuration parameters for SecureTwinGrid Local Energy Community and Microgrid Digital Twin."""

from dataclasses import dataclass, field


@dataclass
class SimulationConfig:
    """Configuration parameters for the SecureTwinGrid digital twin simulation.
    
    Default configuration:
    - Community: "Green Valley Community" (ID: "COMM-001")
    - Network Location: "Simulated Local Microgrid"
    - Household Capacity: 500 households
    - Configurable households: 10, 50, 100, 250, 500 (default 100)
    - 15-minute time interval
    - 24-hour duration (96 time steps)
    - Deterministic random seed for reproducibility
    """
    # Community & Microgrid Boundary Configuration
    community_id: str = "COMM-001"
    community_name: str = "Green Valley Community"
    community_description: str = "Simulated residential prosumer microgrid with rooftop solar and battery storage"
    location_name: str = "Simulated Local Microgrid"
    household_capacity: int = 500

    # Household provisioning
    num_households: int = 100
    interval_minutes: int = 15
    duration_hours: int = 24
    random_seed: int = 42

    # Prosumer technology adoption probabilities (Penetration rates)
    solar_probability: float = 0.50     # 50% of households have solar PV
    battery_probability: float = 0.35   # 35% of households have a home battery
    ev_probability: float = 0.20        # 20% of households have an EV

    # Solar PV capacity range (in kW)
    solar_min_kw: float = 3.0
    solar_max_kw: float = 7.5

    # Home Battery Energy Storage System (BESS) capacity range (in kWh)
    battery_min_kwh: float = 5.0
    battery_max_kwh: float = 13.5
    battery_initial_min_ratio: float = 0.20
    battery_initial_max_ratio: float = 0.50

    # Electric Vehicle (EV) battery capacity range (in kWh)
    ev_min_kwh: float = 40.0
    ev_max_kwh: float = 75.0
    ev_initial_min_ratio: float = 0.30
    ev_initial_max_ratio: float = 0.60
    ev_charging_power_kw: float = 7.2  # Standard Level 2 home charging power

    # Base electricity consumption range (in kW)
    base_consumption_min_kw: float = 0.6
    base_consumption_max_kw: float = 2.2

    def __post_init__(self):
        """Validate configuration parameters and household capacity boundaries."""
        if self.num_households < 1:
            raise ValueError(f"num_households must be at least 1, got {self.num_households}")
        if self.num_households > self.household_capacity:
            raise ValueError(
                f"Household count ({self.num_households}) cannot exceed community capacity ({self.household_capacity})."
            )

    @property
    def interval_hours(self) -> float:
        """Simulation interval converted to fractional hours (e.g. 15 min = 0.25 hrs)."""
        return self.interval_minutes / 60.0

    @property
    def total_steps(self) -> int:
        """Total number of discrete time-steps over the simulation duration."""
        return int((self.duration_hours * 60) / self.interval_minutes)
