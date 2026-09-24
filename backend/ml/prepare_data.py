"""
ml/prepare_data.py -- ML Step 1: data preparation.

Question this file answers:
    "What information available at time t can we legitimately use to predict
     what happens at t + horizon?"

Pipeline
    1. Load data/traffic_dataset.csv and inspect columns / dtypes.
    2. Audit for leakage and for temporal signal (BEFORE fixing the target).
    3. Build features that only use information available at time t:
         - current sensor state (count, speed, density, free-flow speed, IR lanes)
         - time-of-day features parsed from Timestamp
         - LAGGED and ROLLING values of the state (past + present only)
    4. Build the target from the FUTURE row (t + horizon), never from row t.
    5. Split chronologically with an embargo, so no training target overlaps
       the validation/test period. Nothing is ever shuffled.
    6. Save the splits + metadata and print a summary.

Run from the project root:
    python -m ml.prepare_data
"""
from __future__ import annotations

import ast
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

# ============================================================== configuration
PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_CSV = PROJECT_ROOT / "data" / "traffic_dataset.csv"
OUT_DIR = PROJECT_ROOT / "data" / "processed"

HORIZON_MIN = 5                 # predict the state 5 minutes ahead
LAGS = (1, 5)                   # value of the state 1 and 5 minutes ago
ROLL_WINDOWS = (5, 15)          # mean over the last 5 / 15 minutes (incl. t)
TRAIN_FRAC, VAL_FRAC = 0.70, 0.15   # remaining 15% -> test
AUDIT_HORIZONS = (1, 5, 15, 30, 60)
SIGNAL_MARGIN = 0.03            # min accuracy lift over the class prior that we
                                # call "real temporal signal" (~3 std errors here)

# ---- exact CSV column names (spaces / capitalisation matter) ----------------
COL_TS = "Timestamp"
COL_IR = "IR Presence (Lane 1-4)"
COL_COUNT = "Vehicle Count"
COL_SPEED = "Avg Speed (km/h)"
COL_DENSITY = "Vehicle Density (%)"
COL_FFS = "FreeFlowSpeed (km/h)"
COL_LEVEL = "Congestion Level"   # used ONLY to build the target
COL_CI = "CI"                    # used ONLY in the leakage audit

REQUIRED_COLS = [COL_TS, COL_IR, COL_COUNT, COL_SPEED, COL_DENSITY, COL_FFS, COL_LEVEL]
NUMERIC_COLS = [COL_COUNT, COL_SPEED, COL_DENSITY, COL_FFS]

# Deliberately NOT used as model inputs (derived from the raw sensors, or the
# label itself): CI, Congestion Level, Volume/Saturation ratio, VLSR, TSR,
# Speed Factor. "Saturation Flow Rate" is constant (1800) so carries nothing,
# and "Vehicle Types Detected" is free text with implausible entries.

LEVEL_ORDER = {"Low": 0, "Moderate": 1, "High": 2, "Very High": 3}
BOTTLENECK_MIN_LEVEL = 2         # High or Very High == "bottleneck"

IR_COLS = [f"ir_lane{i}" for i in range(1, 5)]
BASE_FEATURES = ["vehicle_count", "avg_speed", "vehicle_density",
                 "free_flow_speed"] + IR_COLS + ["ir_active_lanes"]
TIME_FEATURES = ["minute_of_hour", "hour_sin", "hour_cos"]
LAG_SOURCE_COLS = ["vehicle_count", "avg_speed", "vehicle_density", "ir_active_lanes"]

TARGET_COL = "target_bottleneck"     # primary target (binary)
TARGET_LEVEL_COL = "target_level"    # 4-level version, kept for reference
NAIVE_COL = "naive_current_bottleneck"  # "persistence" baseline. NOT a feature.

# Kept in the saved files for bookkeeping, but never fed to the model:
#   elapsed_min / day_index: a monotone counter. Trees cannot extrapolate it and
#   it would let the model "recognise" a period instead of learning traffic.
META_COLS = ["elapsed_min", "day_index"]


@dataclass
class PreparedData:
    train: pd.DataFrame
    val: pd.DataFrame
    test: pd.DataFrame
    features: list
    target: str
    horizon_min: int
    dropped_constant: list
    missing_before: dict
    rows_raw: int
    rows_dropped_missing: int
    audit_state: pd.DataFrame
    audit_autocorr: pd.DataFrame
    has_temporal_signal: bool
    ci_determinism_r2: float | None
    cut_train: int
    cut_val: int


# ================================================================ 1. loading
def load_raw(path: Path = RAW_CSV) -> pd.DataFrame:
    df = pd.read_csv(path)
    df.columns = [str(c).strip() for c in df.columns]
    missing = [c for c in REQUIRED_COLS if c not in df.columns]
    if missing:
        raise KeyError(f"CSV is missing expected columns: {missing}")
    return df


def inspect_columns(df: pd.DataFrame) -> None:
    print("=" * 70)
    print(f"RAW DATA: {df.shape[0]} rows x {df.shape[1]} columns")
    print("=" * 70)
    info = pd.DataFrame({
        "dtype": df.dtypes.astype(str),
        "n_missing": df.isna().sum(),
        "n_unique": df.nunique(),
    })
    info.index = [str(i).replace("\n", " ") for i in info.index]
    print(info.to_string())
    constant = [c.replace("\n", " ") for c in df.columns if df[c].nunique() <= 1]
    if constant:
        print(f"\nConstant columns (carry no information): {constant}")


# ======================================================= 2. parsing / encoding
def parse_elapsed_timestamp(ts: pd.Series) -> pd.DataFrame:
    """
    Timestamp is an ELAPSED counter (e.g. '8:00:00' ... '80:33:00', +1 minute per
    row), not a wall-clock time: the hour field runs past 24.

    ASSUMPTION: the recording started at 08:00, so clock hour = hour % 24.
    The audit shows no daily pattern in this data, so the assumption is unlikely
    to matter, but it is unverified.
    """
    parts = ts.astype(str).str.strip().str.extract(r"^(\d+):(\d{2}):(\d{2})$")
    bad = parts.isna().any(axis=1)
    if bad.any():
        raise ValueError(f"Unparseable Timestamp values, e.g. {ts[bad].head(3).tolist()}")

    h = parts[0].astype(int)
    m = parts[1].astype(int)
    s = parts[2].astype(int)
    total_sec = h * 3600 + m * 60 + s
    since_start = total_sec - total_sec.min()
    clock_hour = (h % 24) + m / 60.0

    return pd.DataFrame({
        "elapsed_min": since_start // 60,
        "day_index": since_start // 86400,
        "minute_of_hour": m,
        "hour_sin": np.sin(2 * np.pi * clock_hour / 24.0),
        "hour_cos": np.cos(2 * np.pi * clock_hour / 24.0),
    }, index=ts.index)


def _parse_ir(value) -> list:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return [np.nan] * 4
    lanes = ast.literal_eval(value) if isinstance(value, str) else list(value)
    if len(lanes) != 4 or any(v not in (0, 1) for v in lanes):
        raise ValueError(f"IR presence must be 4 binary lane values, got {value!r}")
    return lanes


def encode_ir(series: pd.Series) -> pd.DataFrame:
    """'[0, 1, 1, 0]' -> ir_lane1..ir_lane4 (0/1) + ir_active_lanes (0..4)."""
    arr = np.array([_parse_ir(v) for v in series], dtype=float)
    out = pd.DataFrame(arr, columns=IR_COLS, index=series.index)
    out["ir_active_lanes"] = arr.sum(axis=1)   # stays NaN if any lane is missing
    return out


def encode_level(series: pd.Series) -> pd.Series:
    labels = series.dropna().astype(str).str.strip()
    unknown = set(labels) - set(LEVEL_ORDER)
    if unknown:
        raise ValueError(f"Unknown Congestion Level labels: {sorted(unknown)}")
    return series.astype(str).str.strip().map(LEVEL_ORDER).where(series.notna())


# ============================================================ 3. audits (BEFORE
#                                                             choosing target)
def audit_same_time_determinism(df: pd.DataFrame) -> float | None:
    """
    Leakage check: is CI (and therefore Congestion Level) an exact function of
    the raw sensors at the SAME timestamp? If yes, predicting the CURRENT
    congestion label from current sensors is trivial and proves nothing.
    """
    if COL_CI not in df.columns:
        return None
    X = np.column_stack([
        pd.to_numeric(df[COL_COUNT], errors="coerce"),
        pd.to_numeric(df[COL_SPEED], errors="coerce"),
        pd.to_numeric(df[COL_DENSITY], errors="coerce"),
        np.ones(len(df)),
    ]).astype(float)
    y = pd.to_numeric(df[COL_CI], errors="coerce").to_numpy(dtype=float)
    ok = ~(np.isnan(X).any(axis=1) | np.isnan(y))
    if ok.sum() < 10:
        return None
    coef, *_ = np.linalg.lstsq(X[ok], y[ok], rcond=None)
    resid = y[ok] - X[ok] @ coef
    ss_tot = ((y[ok] - y[ok].mean()) ** 2).sum()
    return float(1.0 - (resid ** 2).sum() / ss_tot) if ss_tot > 0 else None


def temporal_signal_audit(train_grid: pd.DataFrame, horizons, margin: float):
    """
    Is the FUTURE predictable from the PRESENT at all?  Uses TRAINING-PERIOD rows
    only, so no design decision is made by looking at validation/test data.

    state table: for the binary 'bottleneck' state s(t):
        majority_acc = accuracy of always predicting the more common class
        cond_acc     = accuracy of predicting s(t+h) from s(t) (best 2-state rule)
        lift         = cond_acc - majority_acc   (>= margin  =>  real signal)
        phi          = correlation between s(t) and s(t+h)
    autocorr table: lag-h autocorrelation of the raw sensor readings.
    """
    s = train_grid["naive_current_bottleneck"]
    state_rows = []
    for h in horizons:
        fut = s.shift(-h)
        m = s.notna() & fut.notna()
        a, b = s[m].astype(int), fut[m].astype(int)
        n = len(a)
        if n < 50:
            continue
        prior = b.mean()
        majority_acc = max(prior, 1 - prior)
        cond_correct = 0
        for c in (0, 1):
            bc = b[a == c]
            if len(bc):
                cond_correct += max(int(bc.sum()), len(bc) - int(bc.sum()))
        cond_acc = cond_correct / n
        phi = np.corrcoef(a, b)[0, 1] if a.nunique() > 1 and b.nunique() > 1 else np.nan
        state_rows.append({"horizon_min": h, "n_pairs": n,
                           "majority_acc": majority_acc, "cond_acc": cond_acc,
                           "lift": cond_acc - majority_acc, "phi": phi})
    state = pd.DataFrame(state_rows)

    ac_rows = []
    for c in ("vehicle_count", "avg_speed", "vehicle_density"):
        row = {"feature": c}
        for h in horizons:
            row[f"lag{h}"] = train_grid[c].autocorr(lag=h)
        ac_rows.append(row)
    autocorr = pd.DataFrame(ac_rows)

    has_signal = bool(len(state) and (state["lift"] > margin).any())
    return state, autocorr, has_signal


# ================================================== 4. features / targets / split
def build_grid(clean: pd.DataFrame) -> pd.DataFrame:
    """Reindex onto a complete 1-minute grid so shift(k) means exactly k minutes."""
    full = pd.RangeIndex(int(clean["elapsed_min"].min()),
                         int(clean["elapsed_min"].max()) + 1, name="elapsed_min")
    return (clean.set_index("elapsed_min").reindex(full)
            .rename_axis("elapsed_min").reset_index())


def add_history_features(g: pd.DataFrame):
    """Lags and rolling means. Each uses ONLY the present and the past."""
    new = {}
    for c in LAG_SOURCE_COLS:
        for lag in LAGS:
            new[f"{c}_lag{lag}"] = g[c].shift(lag)
        for w in ROLL_WINDOWS:
            new[f"{c}_mean{w}m"] = g[c].rolling(w, min_periods=w).mean()
    return pd.concat([g, pd.DataFrame(new)], axis=1), list(new)


def add_targets(g: pd.DataFrame, horizon: int) -> pd.DataFrame:
    """Targets come from the row `horizon` minutes AHEAD (shift(-horizon))."""
    fut = g["level_num"].shift(-horizon)
    g[TARGET_LEVEL_COL] = fut
    g[TARGET_COL] = (fut >= BOTTLENECK_MIN_LEVEL).astype(float).where(fut.notna())
    g[NAIVE_COL] = ((g["level_num"] >= BOTTLENECK_MIN_LEVEL)
                    .astype(float).where(g["level_num"].notna()))
    return g


def chronological_split(usable: pd.DataFrame, horizon: int,
                        train_frac: float, val_frac: float):
    """
    Earlier -> train, middle -> validation, latest -> test.
    Embargo: a training row at time t has its target at t + horizon, so training
    rows in the last `horizon` minutes before a boundary are dropped. Otherwise
    the training targets would come from the validation/test period.
    """
    t = usable["elapsed_min"].to_numpy()
    n = len(t)
    i1, i2 = int(n * train_frac), int(n * (train_frac + val_frac))
    if not (0 < i1 < i2 < n):
        raise ValueError("Not enough usable rows to make three chronological splits")
    cut1, cut2 = int(t[i1]), int(t[i2])

    train = usable[usable["elapsed_min"] < cut1 - horizon]
    val = usable[(usable["elapsed_min"] >= cut1) & (usable["elapsed_min"] < cut2 - horizon)]
    test = usable[usable["elapsed_min"] >= cut2]
    return train.copy(), val.copy(), test.copy(), cut1, cut2


# ================================================================= 5. main API
def prepare(raw: pd.DataFrame, horizon: int = HORIZON_MIN) -> PreparedData:
    df = raw.copy()
    rows_raw = len(df)

    for c in NUMERIC_COLS:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    ci_r2 = audit_same_time_determinism(df)

    clean = pd.concat([
        parse_elapsed_timestamp(df[COL_TS]),
        pd.DataFrame({
            "vehicle_count": df[COL_COUNT],
            "avg_speed": df[COL_SPEED],
            "vehicle_density": df[COL_DENSITY],
            "free_flow_speed": df[COL_FFS],
            "level_num": encode_level(df[COL_LEVEL]),
        }, index=df.index),
        encode_ir(df[COL_IR]),
    ], axis=1)

    if clean["elapsed_min"].duplicated().any():
        raise ValueError("Duplicate timestamps found; cannot build a time-ordered series")
    clean = clean.sort_values("elapsed_min")

    # Missing-value policy: never impute sensor readings (that would invent data).
    # Rows with a missing raw value are dropped; the gap is kept on the minute
    # grid, so any lag/rolling/target window touching the gap is dropped too.
    required = ["vehicle_count", "avg_speed", "vehicle_density", "free_flow_speed",
                "level_num"] + IR_COLS
    missing_before = {k: int(v) for k, v in clean[required].isna().sum().items()}
    clean = clean.dropna(subset=required)
    rows_dropped_missing = rows_raw - len(clean)

    g = build_grid(clean)
    g, history_features = add_history_features(g)
    g = add_targets(g, horizon)

    features = BASE_FEATURES + TIME_FEATURES + history_features
    needed = features + [TARGET_COL, TARGET_LEVEL_COL, NAIVE_COL]
    usable = g.dropna(subset=needed).copy()
    for c in IR_COLS + ["ir_active_lanes", TARGET_COL, TARGET_LEVEL_COL, NAIVE_COL]:
        usable[c] = usable[c].astype(int)

    train, val, test, cut1, cut2 = chronological_split(usable, horizon,
                                                       TRAIN_FRAC, VAL_FRAC)

    # Audit on the training period only.
    state_tbl, ac_tbl, has_signal = temporal_signal_audit(
        g[g["elapsed_min"] < cut1], AUDIT_HORIZONS, SIGNAL_MARGIN)

    # Drop features that are constant in the training data (e.g. FreeFlowSpeed).
    dropped_constant = [c for c in features if train[c].nunique(dropna=True) <= 1]
    features = [c for c in features if c not in dropped_constant]

    keep = META_COLS + features + [TARGET_COL, TARGET_LEVEL_COL, NAIVE_COL]
    return PreparedData(
        train=train[keep], val=val[keep], test=test[keep],
        features=features, target=TARGET_COL, horizon_min=horizon,
        dropped_constant=dropped_constant, missing_before=missing_before,
        rows_raw=rows_raw, rows_dropped_missing=rows_dropped_missing,
        audit_state=state_tbl, audit_autocorr=ac_tbl,
        has_temporal_signal=has_signal, ci_determinism_r2=ci_r2,
        cut_train=cut1, cut_val=cut2,
    )


# ==================================================================== reporting
def print_target_justification(p: PreparedData) -> None:
    fmt = lambda v: f"{v:.3f}"
    print("\n" + "=" * 70)
    print("TARGET JUSTIFICATION (computed on training-period rows only)")
    print("=" * 70)

    print("\n[1] Same-time leakage check")
    if p.ci_determinism_r2 is None:
        print("    CI column not available, skipped.")
    else:
        print(f"    CI ~ linear(Vehicle Count, Avg Speed, Vehicle Density): "
              f"R^2 = {p.ci_determinism_r2:.4f}")
        if p.ci_determinism_r2 > 0.99:
            print("    => Congestion Level at time t is fully determined by the raw sensors")
            print("       at time t. Predicting the CURRENT label would only rediscover")
            print("       that rule, so the target must be FUTURE state.")

    print("\n[2] Can the future be predicted from the present? (bottleneck = High/Very High)")
    print(p.audit_state.to_string(index=False, float_format=fmt))
    print("\n    Autocorrelation of raw sensor readings:")
    print(p.audit_autocorr.to_string(index=False, float_format=fmt))

    print("\n[3] Verdict")
    if p.has_temporal_signal:
        print(f"    Some horizons beat the class prior by more than {SIGNAL_MARGIN:.0%}: "
              "temporal signal exists; a forecasting model is justified.")
    else:
        print(f"    NO horizon beats the class prior by more than {SIGNAL_MARGIN:.0%}, and "
              "sensor autocorrelations are ~0.")
        print("    Information at time t does not measurably help predict t + horizon.")
        print("    Expect any model to score about the same as 'predict the majority class'.")
        print("    Treat a good-looking score with suspicion (leakage) and a flat score as a")
        print("    real finding about this dataset, not a modelling bug.")

    print("\n[4] Chosen target")
    print(f"    {p.target} = 1 if Congestion Level at t+{p.horizon_min} min is High/Very High, "
          "else 0.")
    print("    Why: the signal optimizer needs 'will this approach be a bottleneck soon?';")
    print("    the classes are relatively balanced; it is a FUTURE quantity; and Congestion Level is")
    print("    used only to LABEL the future row, never as an input.")


def print_summary(p: PreparedData) -> None:
    def dist(d):
        vc = d[p.target].value_counts().sort_index()
        return ", ".join(f"{int(k)}: {v} ({v / len(d):.1%})" for k, v in vc.items())

    def span(d):
        return f"minutes {int(d['elapsed_min'].min())}-{int(d['elapsed_min'].max())}"

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Rows:            {p.rows_raw} raw -> {len(p.train) + len(p.val) + len(p.test)} usable "
          f"({p.rows_dropped_missing} dropped for missing values; the rest lost to "
          f"lag/rolling warm-up, the {p.horizon_min}-min target horizon and split embargoes)")
    print(f"Features ({len(p.features)}): {p.features}")
    if p.dropped_constant:
        print(f"Dropped constant features: {p.dropped_constant}")
    print(f"Target:          {p.target} at t+{p.horizon_min} min "
          "(1 = High/Very High congestion)")
    print(f"Training rows:   {len(p.train)}   [{span(p.train)}]")
    print(f"Validation rows: {len(p.val)}   [{span(p.val)}]")
    print(f"Test rows:       {len(p.test)}   [{span(p.test)}]")
    print("Target distribution:")
    print(f"    train: {dist(p.train)}")
    print(f"    val:   {dist(p.val)}")
    print(f"    test:  {dist(p.test)}")
    total_missing = sum(p.missing_before.values())
    print(f"Missing values:  {total_missing} in required raw columns "
          f"{ {k: v for k, v in p.missing_before.items() if v} or '(none)' }")


def save(p: PreparedData, out_dir: Path = OUT_DIR) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    p.train.to_csv(out_dir / "train.csv", index=False)
    p.val.to_csv(out_dir / "val.csv", index=False)
    p.test.to_csv(out_dir / "test.csv", index=False)
    meta = {
        "features": p.features,
        "target": p.target,
        "horizon_min": p.horizon_min,
        "naive_baseline_column": NAIVE_COL,
        "not_features": META_COLS + [TARGET_COL, TARGET_LEVEL_COL, NAIVE_COL],
        "dropped_constant_features": p.dropped_constant,
        "split_cut_train_min": p.cut_train,
        "split_cut_val_min": p.cut_val,
        "n_train": len(p.train), "n_val": len(p.val), "n_test": len(p.test),
        "has_temporal_signal": p.has_temporal_signal,
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2))
    print(f"\nSaved train/val/test CSVs and meta.json to {out_dir}")


def main() -> None:
    raw = load_raw()
    inspect_columns(raw)
    prepared = prepare(raw)
    print_target_justification(prepared)
    print_summary(prepared)
    save(prepared)


if __name__ == "__main__":
    main()