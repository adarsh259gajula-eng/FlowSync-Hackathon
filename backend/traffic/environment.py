from traffic.model import TrafficObservation
from traffic.data_adapter import build_scenario, calculate_traffic_pressure
from traffic.delay import total_delay
import gymnasium as gym
from gymnasium import spaces
import numpy as np

class TrafficSignalEnvironment(gym.Env):

    def __init__(
        self,
        observation: TrafficObservation,
        phase_split: tuple[float, float]
    ):
        
        super().__init__()

        # 1. Store the original traffic observation
        self.observation = observation

        # 2. Validate phase_split has exactly two values
        if len(phase_split) != 2:
            raise ValueError(
                "phase_split must contain exactly two values: "
                "(north_south_split, east_west_split)"
            )

        ns_split, ew_split = phase_split

        # 3. Validate that the split sums to 1
        if abs((ns_split + ew_split) - 1.0) > 1e-9:
            raise ValueError(
                "phase_split values must sum to 1"
            )

        # Extra safety: individual values should be valid percentages
        if not 0 <= ns_split <= 1:
            raise ValueError(
                "north_south_split must be between 0 and 1"
            )

        if not 0 <= ew_split <= 1:
            raise ValueError(
                "east_west_split must be between 0 and 1"
            )

        self.phase_split = phase_split

        # 4. Build the intersection scenario
        self.scenario = build_scenario(
            observation=self.observation,
            phase_split=self.phase_split
        )

        # 5. Store the current signal configuration
        self.current_ns_green = self.scenario.green_times["north"]
        self.current_ew_green = self.scenario.green_times["east"]

        self.action_space = spaces.Discrete(21)

        self.observation_space = spaces.Box(
            low=np.array(
                [0.0, 0.0, 0.0, 31.0, 31.0],
                dtype=np.float32
            ),
            high=np.array(
                [1.0, 200.0, 200.0, 51.0, 51.0],
                dtype=np.float32
            ),
            dtype=np.float32,
        )


    def get_state(self) -> list[float]:

        # Traffic pressure comes from the real observation
        traffic_pressure = calculate_traffic_pressure(
            self.observation
        )

        # Phase demands come from the simulation scenario
        north_south_demand = self.scenario.phase_demand[
            "north_south"
        ]

        east_west_demand = self.scenario.phase_demand[
            "east_west"
        ]

        # Numerical state for the future RL agent
        state = np.array(
            [
                traffic_pressure,
                north_south_demand,
                east_west_demand,
                self.current_ns_green,
                self.current_ew_green,
            ],
            dtype=np.float32,
        )        

        return state
    
    def get_valid_actions(self) -> list[int]:
        return list(range(31, 52))
    
    def apply_action(self, action: int):
        # 1. Validate the action
        if action not in self.get_valid_actions():
            raise ValueError(
                f"Invalid action: {action}. "
                "NS green time must be between 31 and 51 seconds."
            )

        # 2. Calculate EW green time
        available_green = (
            self.scenario.cycle_length
            - self.scenario.lost_time
        )

        ew_green = available_green - action

        if ew_green <= 0:
            raise ValueError("east_west green time must be > 0")

        # 3. Update environment's current green times
        self.current_ns_green = float(action)
        self.current_ew_green = float(ew_green)

        # 4. Update the scenario
        self.scenario.green_times["north"] = float(action)
        self.scenario.green_times["south"] = float(action)

        self.scenario.green_times["east"] = float(ew_green)
        self.scenario.green_times["west"] = float(ew_green)

    def calculate_reward(self) -> float:
        delay = total_delay(self.scenario)

        # total_delay() returns None when the scenario
        # is not feasible / oversaturated.
        if delay is None:
            return -1_000_000.0

        # Lower delay = higher (less negative) reward
        return -float(delay)

    def step(self, action: int):
            # 1. Apply the selected signal timing
            self.apply_action(action)

            # 2. Calculate reward for the updated scenario
            reward = self.calculate_reward()

            # 3. Get the updated environment state
            state = self.get_state()

            # 4. Return transition result
            return state, reward
        
    def reset(self) -> list[float]:
    # 1. Restore the environment's initial green times
        self.current_ns_green = 41.0
        self.current_ew_green = 41.0

        # 2. Restore the scenario's initial signal configuration
        self.scenario.green_times["north"] = 41.0
        self.scenario.green_times["south"] = 41.0
        self.scenario.green_times["east"] = 41.0
        self.scenario.green_times["west"] = 41.0

        # 3. Return the initial state
        return self.get_state()