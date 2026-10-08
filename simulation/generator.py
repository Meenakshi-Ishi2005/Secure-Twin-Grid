import math
import random
from typing import Tuple


class ProfileGenerator:
    """Generates realistic synthetic solar generation and electricity consumption profiles.
    
    Uses deterministic random seeds for reproducible experiments.
    """

    def __init__(self, random_seed: int = 42):
        self.rng = random.Random(random_seed)

    def set_seed(self, seed: int) -> None:
        """Reset the internal pseudo-random generator with a new seed."""
        self.rng.seed(seed)

    def calculate_solar_generation(
        self,
        solar_capacity_kw: float,
        hour_of_day: float,
        variability: bool = True
    ) -> float:
        """Calculate solar PV generation in kW for a given hour of the day.
        
        Characteristics:
        - Near zero at night (before sunrise ~06:00, after sunset ~18:30)
        - Increases after sunrise
        - Peaks at midday (~12:15 - 12:30)
        - Decreases toward sunset
        - Controlled randomness representing transient cloud cover
        
        Args:
            solar_capacity_kw: Nameplate PV capacity in kW.
            hour_of_day: Fractional hour between 0.0 and 24.0 (e.g. 12.5 = 12:30 PM).
            variability: Whether to apply controlled stochastic atmospheric variation.
            
        Returns:
            float: Solar output in kW (>= 0.0).
        """
        if solar_capacity_kw <= 0:
            return 0.0

        sunrise = 6.0    # 06:00 AM
        sunset = 18.5    # 06:30 PM

        # Zero generation during nighttime
        if hour_of_day <= sunrise or hour_of_day >= sunset:
            return 0.0

        # Daylight span normalized from 0.0 to 1.0
        daylight_progress = (hour_of_day - sunrise) / (sunset - sunrise)
        
        # Smooth bell-shaped curve via sine wave, peaking at midday (progress = 0.5)
        solar_irradiance = math.sin(math.pi * daylight_progress)

        # Controlled cloud/weather variability factor (0.85 to 1.05)
        cloud_factor = 1.0
        if variability:
            cloud_factor = self.rng.uniform(0.85, 1.05)

        raw_generation = solar_capacity_kw * solar_irradiance * cloud_factor
        return max(0.0, round(raw_generation, 4))

    def calculate_consumption_multiplier(self, hour_of_day: float) -> float:
        """Calculate the diurnal electricity demand multiplier for a given hour.
        
        Realistic residential curve features:
        - Late night baseline trough (00:00 - 05:30): low multiplier ~0.45 - 0.55
        - Morning peak (06:30 - 09:30): high demand ~1.80 - 2.10
        - Midday lull (11:00 - 15:30): moderate demand ~0.85 - 1.05
        - Evening peak (17:30 - 21:30): maximum demand ~2.00 - 2.45
        - Night decline (22:00 - 23:59): dropping back to baseline
        """
        h = hour_of_day % 24.0

        if 0.0 <= h < 5.5:
            # Late night / early morning base trough
            return 0.45 + 0.10 * math.sin(math.pi * (h / 5.5))
        elif 5.5 <= h < 9.5:
            # Morning peak
            progress = (h - 5.5) / 4.0
            return 0.55 + 1.45 * math.sin(math.pi * progress)
        elif 9.5 <= h < 16.5:
            # Midday moderate plateau / lull
            progress = (h - 9.5) / 7.0
            return 0.90 + 0.15 * math.sin(math.pi * progress)
        elif 16.5 <= h < 22.0:
            # Evening primary peak
            progress = (h - 16.5) / 5.5
            return 1.05 + 1.35 * math.sin(math.pi * progress)
        else:
            # Late night decline
            progress = (h - 22.0) / 2.0
            return 1.10 - 0.65 * progress

    def calculate_household_consumption(
        self,
        base_consumption_kw: float,
        hour_of_day: float,
        has_ev: bool = False,
        ev_needs_charging: bool = False,
        ev_charge_power_kw: float = 0.0,
        variability: bool = True
    ) -> float:
        """Calculate total instantaneous power demand in kW for a household.
        
        Combines baseline rating, diurnal demand multiplier, controlled random noise,
        and optional EV charging load.
        """
        multiplier = self.calculate_consumption_multiplier(hour_of_day)

        # Controlled household-level behavioral noise (e.g. +/- 10%)
        noise = 1.0
        if variability:
            noise = self.rng.uniform(0.90, 1.12)

        appliance_load = base_consumption_kw * multiplier * noise

        # EV charging load if active during scheduled charging window
        ev_load = 0.0
        if has_ev and ev_needs_charging:
            ev_load = ev_charge_power_kw

        total_consumption = appliance_load + ev_load
        return max(0.1, round(total_consumption, 4))
