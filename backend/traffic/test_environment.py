from pathlib import Path

from traffic.data_adapter import (
    load_traffic_data,
    row_to_traffic_observation,
)
from traffic.environment import TrafficSignalEnvironment


DATA_PATH = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "traffic_dataset.csv"
)


df = load_traffic_data(str(DATA_PATH))

observation = row_to_traffic_observation(df.iloc[0])

env = TrafficSignalEnvironment(
    observation=observation,
    phase_split=(0.60, 0.40),
)

initial_state = env.reset()

print("Initial state:")
print(initial_state)

new_state, reward = env.step(51)

print("\nAfter action 51:")
print(new_state)
print("Reward:", reward)

reset_state = env.reset()

print("\nAfter reset:")
print(reset_state)