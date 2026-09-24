<div align="center">

# 🚦 FlowSync

### AI-Assisted Urban Traffic Congestion & Signal Optimization

*Measurable, explainable, sustainability-aware traffic management.*

</div>

---

FlowSync is an AI-assisted traffic management prototype developed for the **AI for Sustainability Hackathon 2026**, under the **Sustainable Cities** track.

The project addresses urban traffic congestion by analyzing traffic observations, estimating congestion pressure, optimizing traffic signal timings, and estimating the potential sustainability impact of reducing modeled traffic delay.

The current prototype focuses on a **single-intersection simulation** and provides a foundation for future integration of **Reinforcement Learning-based adaptive traffic signal control**.

## 📑 Table of Contents

- [Problem Statement](#-problem-statement)
- [Project Objectives](#-project-objectives)
- [Sustainable Development Goals](#-sustainable-development-goals)
- [Current System](#-current-system)
- [Dataset](#-dataset)
- [Traffic Modeling](#-traffic-modeling)
- [Sustainability Impact](#-sustainability-impact)
- [Machine Learning Analysis](#-machine-learning-analysis)
- [Backend API](#-backend-api)
- [Frontend](#-frontend)
- [Getting Started](#-getting-started)
- [Example Scenario](#-example-scenario)
- [Current Limitations](#-current-limitations)
- [Future Enhancements](#-future-enhancements)
- [Project Philosophy](#-project-philosophy)
- [Hackathon Demonstration Flow](#-hackathon-demonstration-flow)
- [Key Takeaway](#-key-takeaway)
- [Status](#-status)

---

## 🎯 Problem Statement

**PS-3A: Urban Traffic Congestion & Emission Reduction**

Urban traffic bottlenecks result in:

- Increased vehicle waiting and idle time
- Higher fuel consumption
- Increased greenhouse gas emissions
- Reduced road efficiency
- Longer travel times
- Increased noise and air pollution

The objective is to develop an AI-assisted system that can:

1. Analyze urban traffic conditions
2. Identify congestion conditions
3. Model traffic demand at an intersection
4. Optimize traffic signal timings
5. Estimate reductions in modeled traffic delay
6. Translate modeled delay reductions into estimated fuel and CO₂ savings
7. Provide a foundation for future adaptive traffic signal control using Reinforcement Learning

---

## 🧭 Project Objectives

FlowSync currently focuses on four main objectives.

### Traffic Analysis

Analyze traffic observations containing:

- Vehicle count
- Average speed
- Vehicle density
- Free-flow speed
- Saturation flow rate
- Congestion level
- Infrared sensor presence

### Signal Optimization

Compare a baseline signal plan with an optimized signal plan based on modeled traffic demand.

### Sustainability Estimation

Estimate the following from the modeled reduction in traffic delay:

- Vehicle-hours saved
- Fuel saved
- CO₂ emissions avoided

### Decision Support

Provide traffic operators with an interpretable dashboard following this chain:

```text
Traffic Observation
        ↓
Traffic Scenario
        ↓
Signal Optimization
        ↓
Delay Reduction
        ↓
Estimated Sustainability Impact
```

---

## 🌍 Sustainable Development Goals

| SDG | Alignment |
| --- | --- |
| **SDG 9** — Industry, Innovation and Infrastructure | Promotes intelligent infrastructure and AI-assisted transportation systems. |
| **SDG 11** — Sustainable Cities and Communities | Supports more efficient and sustainable urban mobility. |
| **SDG 13** — Climate Action | Targets reductions in estimated fuel consumption and CO₂ emissions through reduced modeled traffic delay. |

---

## 🏗️ Current System

### Pipeline

```text
Traffic Dataset
      ↓
Data Adapter
      ↓
Traffic Observation
      ↓
Intersection Scenario
      ↓
Webster Delay Model
      ↓
Signal Optimization
      ↓
Fuel / CO₂ Estimation
      ↓
FastAPI Backend
      ↓
React Frontend
```

The frontend lets the user select a **traffic timestamp** and a **directional traffic scenario**. The backend then analyzes the selected observation and returns:

- Traffic conditions
- Baseline signal timing
- Optimized signal timing
- Delay reduction
- Estimated sustainability impact

### Technology Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React, Vite, JavaScript, CSS |
| **Backend** | Python, FastAPI, Pydantic |
| **Data & Analysis** | Pandas, NumPy, Scikit-learn |
| **Traffic Modeling** | Webster signal delay model, rule-based traffic scenario construction, candidate signal timing optimization |
| **Future AI** | Reinforcement Learning (DQN / PPO or similar policy-based methods) |
| **Dataset** | CSV-based traffic observations; OpenStreetMap and public traffic datasets can be incorporated in future versions |

### Project Structure

```text
FlowSync-Hackathon/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   │
│   ├── api/
│   │   └── main.py
│   │
│   ├── traffic/
│   │   ├── model.py
│   │   ├── data_adapter.py
│   │   ├── delay.py
│   │   ├── optimizer.py
│   │   ├── objective.py
│   │   ├── impact.py
│   │   ├── config.py
│   │   └── environment.py
│   │
│   ├── ml/
│   │   ├── prepare_data.py
│   │   └── model.py
│   │
│   ├── data/
│   │   └── traffic_dataset.csv
│   │
│   ├── models/
│   │
│   └── requirements.txt
│
├── .gitignore
└── README.md
```

---

## 📊 Dataset

The current prototype uses a traffic dataset containing **4,354 observations** and **14 columns**.

| Feature | Description |
| --- | --- |
| Timestamp | Traffic observation time |
| IR Presence (Lane 1-4) | Binary infrared sensor states |
| Vehicle Count | Observed vehicle count |
| Avg Speed (km/h) | Average observed vehicle speed |
| Vehicle Types Detected | Detected vehicle-type information |
| Vehicle Density (%) | Estimated traffic density |
| Saturation Flow Rate | Intersection saturation flow |
| Volume to Saturation Ratio | Traffic volume relative to saturation |
| FreeFlowSpeed | Free-flow speed |
| TSR | Traffic speed ratio |
| VLSR | Volume-to-lane saturation ratio |
| Speed Factor | Average speed relative to free-flow speed |
| CI | Congestion Index |
| Congestion Level | Classified congestion state |

### Important Dataset Findings

Several relationships in the dataset are deterministic:

```text
Volume/Saturation Ratio ∝ Vehicle Count
VLSR                    ∝ Vehicle Count
Speed Factor             = Avg Speed / FreeFlowSpeed
TSR                      = 1 - Speed Factor
```

The congestion classification is also deterministically derived from the Congestion Index.

The dataset does **not** contain reliable directional traffic counts for North, South, East, and West. FlowSync therefore does not pretend that the dataset provides actual directional demand. Instead, directional demand is explicitly modeled using predefined scenarios.

---

## 🧮 Traffic Modeling

### Direction Scenarios

The frontend provides three traffic scenarios:

| Scenario | North-South | East-West |
| --- | :---: | :---: |
| Balanced | 50% | 50% |
| North-South Heavy | 60% | 40% |
| East-West Heavy | 40% | 60% |

> [!NOTE]
> These are simulation assumptions, **not** measured directional traffic volumes from the dataset. They allow the system to demonstrate how different directional demand conditions can affect signal timing.

### Traffic Pressure

FlowSync calculates a normalized traffic pressure:

```text
Density Pressure = Vehicle Density / 100

Speed Pressure   = 1 - (Average Speed / Free Flow Speed)

Traffic Pressure = 0.5 × Density Pressure + 0.5 × Speed Pressure
```

The result is constrained to the range `0 ≤ Traffic Pressure ≤ 1` and represents the severity of traffic conditions within the prototype.

### Intersection Scenario

The backend converts a traffic observation into an intersection scenario. The prototype models a four-approach intersection:

```text
             NORTH
               │
               │
               ▼
        ┌─────────────┐
        │             │
WEST ──►│ INTERSECTION│──► EAST
        │             │
        └─────────────┘
               │
               ▼
             SOUTH
```

The approaches are grouped into two signal phases:

| Phase | Approaches |
| --- | --- |
| Phase 1 | North + South |
| Phase 2 | East + West |

The prototype uses **1 lane per approach** and a saturation flow of **1800 vehicles/hour/lane**, based on the dataset's saturation-flow value.

### Signal Timing

| Parameter | Value |
| --- | --- |
| Baseline North-South green | 41 seconds |
| Baseline East-West green | 41 seconds |
| Cycle length | 90 seconds |
| Lost time | 8 seconds |
| Optimizer search range (North-South phase) | 31–51 seconds |

The optimizer searches possible North-South green times and derives the corresponding East-West green time.

### Delay Model

FlowSync uses a **Webster-style signal delay model**, which considers:

- Cycle length
- Effective green time
- Degree of saturation
- Traffic demand
- Signal phase capacity

The degree of saturation is calculated as:

```text
x = Demand / Capacity
```

If a phase becomes infeasible because `x >= 1`, the candidate signal plan is rejected. The optimizer evaluates feasible plans and selects the one with the lowest modeled objective.

### Signal Optimization

```text
Traffic Observation
        ↓
Create Intersection Scenario
        ↓
Generate Candidate Signal Plans
        ↓
Calculate Webster Delay
        ↓
Reject Infeasible Plans
        ↓
Evaluate Remaining Plans
        ↓
Select Optimized Plan
```

The result contains:

- Baseline signal timing
- Optimized signal timing
- Baseline modeled delay
- Optimized modeled delay
- Modeled delay reduction

### Multi-Objective Framework

The project contains a multi-objective framework considering traffic delay, fuel consumption, and CO₂ emissions.

| Objective | Weight |
| --- | :---: |
| Delay | 50% |
| Fuel | 25% |
| CO₂ | 25% |

Under the current prototype assumptions, fuel and CO₂ are directly derived from delay, so the objective is effectively dominated by modeled delay minimization. The framework is designed to allow more independent sustainability objectives to be introduced in future versions.

---

## 🌱 Sustainability Impact

The project converts modeled delay reduction into estimated sustainability impact.

| Assumption | Value |
| --- | --- |
| Idle fuel rate | 0.8 L / vehicle-hour |
| CO₂ factor | 2.3 kg CO₂ / liter |

```text
Vehicle Hours Saved = Delay Reduction / 3600

Fuel Saved          = Vehicle Hours Saved × 0.8

CO₂ Saved           = Fuel Saved × 2.3
```

> [!WARNING]
> **Sustainability disclaimer.** The sustainability values are *modeled estimates*. They are not direct measurements from vehicle fuel sensors, real-world fuel consumption, emission monitoring stations, or production traffic signal controllers.
>
> Results should be interpreted as *estimated sustainability impact under the prototype's traffic and fuel assumptions*, rather than measured real-world emissions reductions.

---

## 🤖 Machine Learning Analysis

A preliminary machine-learning investigation was performed to determine whether the available dataset could reliably predict future congestion. The experiment created temporal features and attempted to predict congestion approximately five minutes ahead. Models were evaluated against simple baselines.

| Metric | Result |
| --- | :---: |
| Model accuracy | 52.6% |
| Majority baseline | 54.4% |
| Persistence baseline | 52.7% |
| ROC-AUC | 0.504 |

The results did not demonstrate meaningful predictive signal, and test performance was also close to baseline. The current system therefore **does not claim successful traffic forecasting** from this dataset. This is an important limitation of the dataset rather than something hidden by the application.

---

## 🔌 Backend API

The backend is implemented with FastAPI.

**Base URL:** `http://localhost:8000`

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/analyze` | Analyze a traffic observation |

### Health Check

```http
GET /api/health
```

```json
{
  "status": "ok"
}
```

### Traffic Analysis

```http
POST /api/analyze
```

**Request**

```json
{
  "timestamp": "08:17:00",
  "direction_scenario": "north_south_heavy"
}
```

Valid `direction_scenario` values: `balanced`, `north_south_heavy`, `east_west_heavy`.

**Example response**

```json
{
  "observation": {
    "timestamp": "08:17:00",
    "vehicle_count": 72,
    "avg_speed": 35.7,
    "vehicle_density": 67.0,
    "congestion_level": "High"
  },
  "baseline": {
    "north_south_green": 41,
    "east_west_green": 41,
    "delay": 970.4969
  },
  "optimized": {
    "north_south_green": 51,
    "east_west_green": 31,
    "delay": 930.9253,
    "delay_reduction": 39.5716
  },
  "impact": {
    "vehicle_hours_saved": 0.0109921,
    "fuel_saved_liters": 0.0087937,
    "co2_saved_kg": 0.0202255
  }
}
```

---

## 🖥️ Frontend

### Workflow

```text
Select Timestamp
        ↓
Select Direction Scenario
        ↓
Click "Analyze Traffic"
        ↓
POST /api/analyze
        ↓
Backend processes observation
        ↓
Optimizer calculates signal plan
        ↓
Frontend receives response
        ↓
Dashboard updates
```

The frontend should **not** generate random traffic values or simulate live telemetry. All displayed traffic analysis values come from the backend response.

### Dashboard

| Section | Displays |
| --- | --- |
| **Traffic Overview** | Vehicle count, average speed, vehicle density, congestion level, timestamp |
| **Signal Optimization** | Baseline and optimized signal timing, baseline and optimized delay, modeled delay reduction |
| **Sustainability Impact** | Vehicle-hours saved, estimated fuel saved, estimated CO₂ reduction |
| **Intersection Visualization** | North-South and East-West phases, showing how signal timing changes between baseline and optimized plans |

---

## 🚀 Getting Started

### Run the Backend

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate      # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Start FastAPI
uvicorn api.main:app --reload --port 8000
```

- API: <http://localhost:8000>
- Interactive docs: <http://localhost:8000/docs>

### Run the Frontend

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

The frontend is normally available at <http://localhost:5173>. The exact port may vary depending on Vite configuration.

### CORS Configuration

The FastAPI backend allows requests from the development frontend, so the React dev server can communicate with the API:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Testing

Test the backend independently before running the frontend.

**Health check**

```bash
curl http://localhost:8000/api/health
```

Expected: `{"status": "ok"}`

**Analyze traffic**

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "08:17:00",
    "direction_scenario": "north_south_heavy"
  }'
```

The response should contain `observation`, `baseline`, `optimized`, and `impact`.

---

## 🔍 Example Scenario

Suppose the selected observation is:

| Field | Value |
| --- | --- |
| Timestamp | 08:17:00 |
| Vehicle Count | 72 |
| Average Speed | 35.7 km/h |
| Vehicle Density | 67% |
| Congestion | High |

and the user selects **North-South Heavy**, so the system applies a 60% / 40% North-South / East-West split. The optimizer then evaluates signal timings:

| Plan | N/S Green | E/W Green |
| --- | :---: | :---: |
| Baseline | 41 sec | 41 sec |
| Optimized | 51 sec | 31 sec |

The system then calculates the difference in modeled delay and estimates the corresponding sustainability impact.

---

## ⚠️ Current Limitations

1. **Directional traffic data** — The dataset does not contain reliable North/South/East/West directional demand, so directional splits are simulated.
2. **Limited temporal predictability** — The dataset does not provide strong temporal signal for forecasting future vehicle counts or congestion.
3. **Single intersection** — The current model focuses on one simulated intersection.
4. **Static dataset** — The demonstration uses a CSV dataset rather than a live traffic feed.
5. **Modeled delay** — Delay values are calculated using a traffic signal model and are not direct measurements from a physical intersection.
6. **Estimated emissions** — Fuel and CO₂ values depend on prototype assumptions.
7. **No production signal control** — The system does not communicate with real-world traffic signal controllers.
8. **Reinforcement Learning not yet integrated** — The current production path uses deterministic signal optimization. An RL environment has been prepared as groundwork for future development, but a trained RL policy is not part of the production decision pipeline.

---

## 🔮 Future Enhancements

### Reinforcement Learning-Based Signal Control

A major future enhancement is integrating a trained Reinforcement Learning model.

```text
Traffic State
      ↓
RL Environment
      ↓
RL Agent
      ↓
Signal Timing Action
      ↓
Traffic Simulation
      ↓
Reward
      ↓
Policy Update
```

The agent could observe traffic pressure, vehicle demand, current signal timings, congestion state, and phase information, and learn actions such as *increase N/S green*, *decrease N/S green*, or *maintain current timing*. Potential algorithms include DQN, PPO, and Actor-Critic methods. The RL model would eventually replace or complement the current candidate-search optimizer.

### Real-Time Traffic Data

Integrate traffic cameras, IoT sensors, inductive loops, GPS probe data, connected vehicles, and public traffic APIs, allowing FlowSync to operate on continuously updated traffic conditions.

### Directional Traffic Detection

Use datasets that provide actual northbound, southbound, eastbound, and westbound volumes, eliminating the need for simulated directional splits.

### Multi-Intersection Optimization

Expand from a single intersection to a corridor of intersections, enabling optimization of traffic corridors rather than isolated intersections.

```text
Intersection A → Intersection B → Intersection C → Intersection D
```

### Coordinated Traffic Signals

Optimize multiple intersections together to create:

- Green waves
- Corridor coordination
- Reduced stop-and-go traffic
- Reduced queue propagation

### Improved Emission Modeling

Instead of a constant idle fuel rate, incorporate vehicle type, engine characteristics, speed, acceleration, idle duration, fuel consumption curves, and emission factors. This would provide more realistic estimates of fuel consumption, CO₂, NOx, and PM2.5.

### Predictive Traffic Modeling

With a larger and more temporally informative dataset, future models could predict traffic volume, congestion probability, queue length, and travel time for future time horizons. Potential models include XGBoost, Random Forest, LSTM, Temporal CNN, Transformers, and Graph Neural Networks.

### Computer Vision

Process traffic camera feeds to detect vehicles, vehicle classes, lane occupancy, queue length, pedestrians, and cyclists, providing real-time traffic state information to the optimization or RL system.

### Long-Term Architecture

```text
Traffic Cameras / IoT / GPS
             ↓
      Data Processing
             ↓
      Traffic Prediction
             ↓
       Traffic State
             ↓
   ┌──────────────────────┐
   │ RL Signal Controller │
   └──────────────────────┘
             ↓
       Signal Timing
             ↓
      Traffic Response
             ↓
    Reward Calculation
             ↓
        RL Learning
             ↓
      Improved Policy
```

The sustainability layer would continuously estimate:

```text
Delay Reduction → Fuel Reduction → CO₂ Reduction
```

---

## 💡 Project Philosophy

FlowSync is designed around one principle:

> **Traffic optimization should be measurable, explainable, and sustainability-aware.**

Instead of only showing an AI prediction, the system connects traffic conditions to sustainability outcomes through an interpretable chain:

```text
Traffic Conditions
        ↓
     Decision
        ↓
  Signal Timing
        ↓
  Traffic Delay
        ↓
Fuel Consumption
        ↓
   CO₂ Impact
```

---

## 🎬 Hackathon Demonstration Flow

| Step | Action | Details |
| :---: | --- | --- |
| 1 | **Select traffic snapshot** | Choose `08:17:00` |
| 2 | **Select traffic scenario** | Choose *North-South Heavy* |
| 3 | **Analyze** | Click **Analyze Traffic** |
| 4 | **Show traffic condition** | Vehicle count, average speed, density, congestion level |
| 5 | **Show signal optimization** | Compare `41s / 41s` against `51s / 31s` |
| 6 | **Show modeled delay reduction** | Explain that the optimized timing produces a lower modeled delay under the selected scenario |
| 7 | **Show sustainability impact** | Estimated vehicle-hours saved, fuel saved, CO₂ reduction |
| 8 | **Explain future RL integration** | The current optimizer establishes the decision-making pipeline; a trained RL controller can later learn adaptive signal policies from traffic states |

---

## 🏁 Key Takeaway

FlowSync demonstrates an AI-assisted approach to urban traffic management by connecting traffic observations with signal optimization and sustainability estimation.

| Today | Evolving toward |
| --- | --- |
| Traffic analysis | Real-time traffic data |
| Signal optimization | Traffic prediction |
| Delay modeling | Reinforcement Learning |
| Sustainability estimation | Multi-intersection optimization |
| | Real-time adaptive signal control |

---

## ✅ Status

### Current

- [x] Traffic dataset integration
- [x] Traffic observation processing
- [x] Traffic pressure calculation
- [x] Intersection scenario modeling
- [x] Webster delay calculation
- [x] Signal timing optimization
- [x] Sustainability impact estimation
- [x] FastAPI backend
- [x] React frontend integration
- [x] Baseline vs optimized signal comparison
- [x] API validation and error handling
- [x] Preliminary ML benchmarking

### Future

- [ ] Train Reinforcement Learning traffic signal agent
- [ ] Integrate RL policy into decision pipeline
- [ ] Real-time traffic data
- [ ] Directional traffic detection
- [ ] Multi-intersection optimization
- [ ] Coordinated traffic signals
- [ ] Computer vision traffic detection
- [ ] Improved vehicle-specific emission modeling
- [ ] Production traffic-controller integration