"""
ml/model.py -- ML Step 2: baseline classifier and an honest benchmark.

Not the final AI system. The purpose is to answer one question defensibly:
    "Does a simple model beat 'always predict the majority class'?"

Flow
    1. Load data/processed/{train,val,test}.csv + meta.json (from prepare_data).
    2. Pipeline integrity checks (no leaky feature names, no NaNs, chronological
       order with embargo, both classes present ...). Stop if any check fails.
    3. Fit Logistic Regression on TRAIN only (scaler is fit on train only).
    4. Evaluate on VALIDATION next to two baselines:
         - majority class (from train)
         - persistence ("future bottleneck = current bottleneck")
       Report accuracy / precision / recall / F1 / ROC-AUC / confusion matrix,
       plus a bootstrap confidence interval for the lift over the majority baseline.
    5. Leakage tripwire: a large, significant lift is treated as a red flag,
       not a success. The test set is then NOT touched and nothing is saved.
    6. Otherwise evaluate ONCE on the held-out TEST set. No tuning afterwards.
    7. Save the model only if the pipeline is valid. The file records whether it
       actually beat the baseline, so a flat result cannot be mistaken for a win.

Run from the project root (after `python -m ml.prepare_data`):
    python -m ml.model
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, confusion_matrix, f1_score,
                             precision_score, recall_score, roc_auc_score)
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

# ============================================================== configuration
PROJECT_ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
MODEL_DIR = PROJECT_ROOT / "models"
MODEL_PATH = MODEL_DIR / "baseline_logreg.joblib"
MODEL_META_PATH = MODEL_DIR / "baseline_logreg_meta.json"

N_BOOT = 2000               # bootstrap resamples for the lift confidence interval
SUSPICIOUS_LIFT = 0.10      # significant lift above this => suspect leakage
SEED = 0

# Feature names that must never appear as inputs (derived columns, the label
# itself, the naive baseline, or the monotone time counter).
FORBIDDEN_FEATURE = re.compile(
    r"(^ci$|^ci_|congestion|level|target|naive|vlsr|tsr|speed_factor|"
    r"saturation_ratio|elapsed|day_index)", re.IGNORECASE)


# ================================================================== 1. loading
def load_splits():
    meta_path = PROCESSED_DIR / "meta.json"
    if not meta_path.exists():
        raise FileNotFoundError(
            f"{meta_path} not found. Run `python -m ml.prepare_data` first.")
    meta = json.loads(meta_path.read_text())
    splits = {name: pd.read_csv(PROCESSED_DIR / f"{name}.csv")
              for name in ("train", "val", "test")}
    return meta, splits


# ======================================================= 2. integrity checks
def check_pipeline(meta: dict, splits: dict) -> list:
    """Return a list of problems. Empty list == the pipeline is valid."""
    problems = []
    feats, target = meta["features"], meta["target"]
    horizon = meta["horizon_min"]

    if not feats:
        problems.append("meta.json lists no features")
        return problems

    bad = [f for f in feats if FORBIDDEN_FEATURE.search(f)]
    if bad:
        problems.append(f"forbidden/leaky feature names used as inputs: {bad}")
    overlap = set(feats) & set(meta.get("not_features", []))
    if overlap:
        problems.append(f"features overlap with declared non-features: {sorted(overlap)}")

    for name, df in splits.items():
        if len(df) == 0:
            problems.append(f"{name} split is empty")
            continue
        missing = [c for c in feats + [target, "elapsed_min"] if c not in df.columns]
        if missing:
            problems.append(f"{name} split is missing columns: {missing}")
            continue
        if df[feats].isna().any().any():
            problems.append(f"{name} split has NaNs in features")
        if not set(df[target].unique()) <= {0, 1}:
            problems.append(f"{name} target is not binary 0/1")
    if problems:
        return problems      # ordering checks below need the columns to exist

    tr, va, te = splits["train"], splits["val"], splits["test"]
    if not tr["elapsed_min"].max() + horizon < va["elapsed_min"].min():
        problems.append("train targets overlap the validation period (embargo violated)")
    if not va["elapsed_min"].max() + horizon < te["elapsed_min"].min():
        problems.append("validation targets overlap the test period (embargo violated)")
    if tr[target].nunique() < 2:
        problems.append("train target has only one class")
    constant = [f for f in feats if tr[f].nunique() <= 1]
    if constant:
        problems.append(f"constant features in train: {constant}")
    return problems


# ===================================================================== 3. model
def build_model():
    # The scaler lives INSIDE the pipeline, so it is fit on training data only.
    return make_pipeline(StandardScaler(),
                         LogisticRegression(max_iter=1000, random_state=SEED))


# =============================================================== 4. evaluation
def evaluate(y, pred, score) -> dict:
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    return {
        "accuracy": float(accuracy_score(y, pred)),
        "precision": float(precision_score(y, pred, zero_division=0)),
        "recall": float(recall_score(y, pred, zero_division=0)),
        "f1": float(f1_score(y, pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y, score)) if len(np.unique(y)) == 2 else float("nan"),
        "confusion": [[int(tn), int(fp)], [int(fn), int(tp)]],
    }


def lift_over(y, pred_model, pred_base) -> dict:
    """Accuracy lift of the model over a baseline, with a paired bootstrap 95% CI."""
    y, pred_model, pred_base = map(np.asarray, (y, pred_model, pred_base))
    per_row = (pred_model == y).astype(float) - (pred_base == y).astype(float)
    rng = np.random.default_rng(SEED)
    idx = rng.integers(0, len(y), size=(N_BOOT, len(y)))
    boot = per_row[idx].mean(axis=1)
    lo, hi = np.percentile(boot, [2.5, 97.5])
    return {"lift": float(per_row.mean()), "ci_low": float(lo), "ci_high": float(hi)}


def run_split(pipe, df, features, target, majority_class, naive_col) -> dict:
    X, y = df[features], df[target].to_numpy()
    proba = pipe.predict_proba(X)[:, 1]
    pred = (proba >= 0.5).astype(int)

    maj_pred = np.full(len(y), majority_class)
    naive_pred = df[naive_col].to_numpy().astype(int)

    return {
        "y": y, "model_pred": pred,
        "results": {
            "Logistic Regression": evaluate(y, pred, proba),
            f"Majority class ({majority_class})": evaluate(y, maj_pred, maj_pred.astype(float)),
            "Persistence (now -> later)": evaluate(y, naive_pred, naive_pred.astype(float)),
        },
        "lift_vs_majority": lift_over(y, pred, maj_pred),
        "lift_vs_persistence": lift_over(y, pred, naive_pred),
    }


def is_suspicious(lift: dict) -> bool:
    return lift["ci_low"] > 0 and lift["lift"] > SUSPICIOUS_LIFT


def beats_baseline(lift: dict) -> bool:
    return lift["ci_low"] > 0


# ==================================================================== reporting
def print_report(title: str, run: dict) -> None:
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)
    table = pd.DataFrame(run["results"]).T[["accuracy", "precision", "recall", "f1", "roc_auc"]]
    print(table.to_string(float_format=lambda v: f"{v:.3f}"))

    print("\nConfusion matrices (rows = actual, columns = predicted)")
    for name, res in run["results"].items():
        (tn, fp), (fn, tp) = res["confusion"]
        print(f"\n  {name}")
        print(f"                pred 0   pred 1")
        print(f"     actual 0   {tn:6d}   {fp:6d}")
        print(f"     actual 1   {fn:6d}   {tp:6d}")

    for label, key in (("majority-class", "lift_vs_majority"),
                       ("persistence", "lift_vs_persistence")):
        L = run[key]
        print(f"\nAccuracy lift over {label} baseline: {L['lift']:+.3f} "
              f"(95% bootstrap CI {L['ci_low']:+.3f} to {L['ci_high']:+.3f})")


def print_verdict(lift: dict) -> None:
    print("\nVerdict (validation, vs majority baseline)")
    if is_suspicious(lift):
        print(f"  RED FLAG: significant lift of {lift['lift']:+.1%}. With no temporal signal in")
        print("  this data that is not believable. Check for leakage before trusting anything.")
    elif beats_baseline(lift):
        print("  Model beats the majority baseline with a CI above zero, but the lift is small.")
        print("  Verify on the test set and check which features drive it before claiming it.")
    else:
        print("  No evidence that the model beats 'always predict the majority class'")
        print("  (the CI for the lift includes zero). Features at time t do not measurably")
        print("  predict the future state in this dataset.")


# ======================================================================= saving
def save_model(pipe, meta: dict, val_run: dict, test_run: dict) -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": pipe, "features": meta["features"],
                 "target": meta["target"], "horizon_min": meta["horizon_min"]},
                MODEL_PATH)
    info = {
        "model": "StandardScaler + LogisticRegression(max_iter=1000)",
        "features": meta["features"],
        "target": meta["target"],
        "horizon_min": meta["horizon_min"],
        "sklearn_version": sklearn.__version__,
        "pipeline_valid": True,
        "beats_majority_baseline_on_val": beats_baseline(val_run["lift_vs_majority"]),
        "beats_majority_baseline_on_test": beats_baseline(test_run["lift_vs_majority"]),
        "val_lift_vs_majority": val_run["lift_vs_majority"],
        "test_lift_vs_majority": test_run["lift_vs_majority"],
        "val_results": val_run["results"],
        "test_results": test_run["results"],
        "note": ("Baseline for benchmarking. If beats_majority_baseline_* is false, the "
                 "model has no demonstrated predictive value and must not be presented "
                 "as a forecaster."),
    }
    MODEL_META_PATH.write_text(json.dumps(info, indent=2))
    print(f"\nModel saved to {MODEL_PATH}")
    print(f"Metadata saved to {MODEL_META_PATH}")


# ========================================================================= main
def main() -> None:
    meta, splits = load_splits()
    features, target = meta["features"], meta["target"]
    naive_col = meta["naive_baseline_column"]

    print("PIPELINE CHECKS")
    problems = check_pipeline(meta, splits)
    if problems:
        print("  FAILED. Model not trained, nothing saved:")
        for p in problems:
            print(f"   - {p}")
        raise SystemExit(1)
    print("  passed: no leaky feature names, no NaNs, binary target, chronological "
          "order with embargo, both classes in train")

    train, val, test = splits["train"], splits["val"], splits["test"]
    print(f"\nTarget: {target} at t+{meta['horizon_min']} min | features: {len(features)}")
    print(f"Rows: train={len(train)}  val={len(val)}  test={len(test)}")
    print(f"Positive rate: train={train[target].mean():.1%}  "
          f"val={val[target].mean():.1%}  test={test[target].mean():.1%}")

    pipe = build_model().fit(train[features], train[target])
    majority_class = int(train[target].mean() >= 0.5)   # decided from TRAIN only

    val_run = run_split(pipe, val, features, target, majority_class, naive_col)
    print_report("VALIDATION RESULTS", val_run)
    print_verdict(val_run["lift_vs_majority"])

    if is_suspicious(val_run["lift_vs_majority"]):
        print("\nPipeline treated as INVALID. The test set was NOT evaluated and the")
        print("model was NOT saved. Investigate the features/targets first.")
        raise SystemExit(2)

    # ---- the one and only look at the held-out test set (no tuning after this)
    test_run = run_split(pipe, test, features, target, majority_class, naive_col)
    print_report("TEST RESULTS (evaluated once)", test_run)

    if is_suspicious(test_run["lift_vs_majority"]):
        print("\nTest lift is a red flag. Model NOT saved.")
        raise SystemExit(2)

    print("\nSummary")
    print(f"  beats majority baseline on validation: "
          f"{beats_baseline(val_run['lift_vs_majority'])}")
    print(f"  beats majority baseline on test:       "
          f"{beats_baseline(test_run['lift_vs_majority'])}")
    save_model(pipe, meta, val_run, test_run)


if __name__ == "__main__":
    main()