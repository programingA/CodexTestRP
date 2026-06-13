from __future__ import annotations

import csv
import json
import math
import sys
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODEL_ROOT = PROJECT_ROOT.parent / "DeepLearningProject"
MODEL_DIR = MODEL_ROOT / "outputs" / "improved_stock_model_walk_forward"
HOST = "127.0.0.1"
PORT = 8765

sys.path.insert(0, str(MODEL_ROOT))

import explainable_stock_app as stock_app  # noqa: E402


def safe_float(value, digits: int | None = None):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return round(number, digits) if digits is not None else number


def read_csv_rows(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


class ModelRuntime:
    def __init__(self) -> None:
        started_at = time.perf_counter()
        self.artifact = stock_app.load_artifact(MODEL_DIR)
        self.frame, _companies = stock_app.load_feature_frame(
            stock_app.ROOT,
            int(self.artifact["horizon"]),
            float(self.artifact.get("return_threshold", 0.0)),
            str(self.artifact.get("label_mode", "binary")),
        )
        self.symbols = self._build_symbols()
        self.metrics = self._load_metrics()
        self.features = self._load_features()
        self.backtest = self._load_backtest()
        self.ready_ms = round((time.perf_counter() - started_at) * 1000)

    def _build_symbols(self) -> list[dict]:
        rows = []
        preferred = self.artifact.get("selected_symbols", [])
        known_symbols = set(self.frame["Symbol"].unique())
        for symbol in preferred:
            if symbol not in known_symbols:
                continue
            symbol_frame = self.frame[self.frame["Symbol"] == symbol].sort_values("Date")
            valid = symbol_frame.dropna(subset=["future_return"])
            if valid.empty:
                continue
            latest = valid.iloc[-1]
            rows.append(
                {
                    "symbol": symbol,
                    "sector": str(latest.get("Sector", "")),
                    "latestDate": str(latest["Date"].date()),
                    "latestClose": safe_float(latest.get("Adj Close"), 4),
                    "availableRows": int(len(valid)),
                }
            )
        return rows

    def _load_metrics(self) -> list[dict]:
        rows = []
        for row in read_csv_rows(MODEL_DIR / "results_summary.csv"):
            rows.append(
                {
                    "split": row.get("split"),
                    "accuracy": safe_float(row.get("accuracy")),
                    "auc": safe_float(row.get("auc")),
                    "majorityBaseline": safe_float(row.get("majority_baseline")),
                    "meanProbability": safe_float(row.get("mean_probability")),
                    "top10Precision": safe_float(row.get("precision_at_top_10")),
                    "top10Return": safe_float(row.get("mean_return_top_10")),
                    "longShortReturn10": safe_float(row.get("long_short_return_10")),
                }
            )
        return rows

    def _load_features(self) -> list[dict]:
        rows = []
        for row in read_csv_rows(MODEL_DIR / "feature_importance.csv"):
            importance = safe_float(row.get("importance")) or 0.0
            if importance <= 0:
                continue
            rows.append(
                {
                    "feature": row.get("feature"),
                    "label": row.get("label"),
                    "importance": importance,
                }
            )
        rows.sort(key=lambda item: item["importance"], reverse=True)
        return rows[:16]

    def _load_backtest(self) -> list[dict]:
        label_map = {
            "top_10pct_long_only": "Top 10% long only",
            "top_bottom_10pct_long_short": "Top/Bottom 10% long-short",
        }
        rows = []
        for row in read_csv_rows(MODEL_DIR / "backtest_summary.csv"):
            strategy = row.get("strategy", "")
            rows.append(
                {
                    "strategy": label_map.get(strategy, strategy),
                    "periods": safe_float(row.get("periods")),
                    "meanPeriodReturn": safe_float(row.get("mean_period_return")),
                    "cumulativeReturn": safe_float(row.get("cumulative_return")),
                    "sharpe": safe_float(row.get("sharpe")),
                    "maxDrawdown": safe_float(row.get("max_drawdown")),
                }
            )
        return rows

    def latest_date_for(self, symbol: str) -> str:
        match = next((item for item in self.symbols if item["symbol"] == symbol), None)
        if not match:
            raise ValueError(f"Unknown symbol: {symbol}")
        return str(match["latestDate"])

    def available_dates(self, symbol: str, limit: int = 80) -> list[str]:
        symbol = symbol.upper()
        symbol_frame = self.frame[self.frame["Symbol"] == symbol].sort_values("Date")
        if symbol_frame.empty:
            raise ValueError(f"Unknown symbol: {symbol}")
        valid = symbol_frame.dropna(subset=["future_return"])
        return [str(value.date()) for value in valid["Date"].tail(limit).tolist()][::-1]

    def predict(self, symbol: str, date_text: str | None) -> dict:
        symbol = symbol.upper().strip()
        if not date_text:
            date_text = self.latest_date_for(symbol)

        started_at = time.perf_counter()
        x_row, row, prices, context = stock_app.build_single_input(
            self.frame,
            self.artifact,
            symbol,
            date_text,
        )
        explanation = stock_app.explain_one(self.artifact, x_row, row)
        natural = stock_app.build_natural_explanation(
            self.artifact,
            row,
            explanation,
            context,
            "CSV",
        )

        return {
            "runtime": "python-model",
            "elapsedMs": round((time.perf_counter() - started_at) * 1000),
            "symbol": symbol,
            "sector": row["sector"],
            "date": row["date"],
            "adjClose": safe_float(row.get("adj_close"), 6),
            "futureClose": safe_float(row.get("future_close"), 6),
            "futureReturn": safe_float(row.get("future_return"), 6),
            "actualUp": int(row.get("actual_up", 0)),
            "probabilityUp": safe_float(explanation["probability_up"], 6),
            "probabilityDown": safe_float(1.0 - float(explanation["probability_up"]), 6),
            "selectedThreshold": safe_float(explanation["selected_threshold"], 6),
            "predictedUp": int(explanation["predicted_up"]),
            "signalStrength": safe_float(explanation["signal_strength"], 6),
            "context": {
                key: safe_float(value, 6)
                for key, value in context.items()
                if isinstance(value, (int, float))
            },
            "topContributions": [
                {
                    "name": item.get("name"),
                    "label": item.get("label"),
                    "value": safe_float(item.get("value"), 6),
                    "kind": item.get("kind"),
                }
                for item in explanation["top_contributions"][:10]
            ],
            "naturalExplanation": natural,
            "priceSeries": [safe_float(value, 4) for value in prices.tolist()],
        }

    def sample_csv(self, symbol: str) -> str:
        symbol = symbol.upper().strip()
        if symbol not in set(self.frame["Symbol"].unique()):
            raise ValueError(f"Unknown symbol: {symbol}")
        return stock_app.sample_csv_for_symbol(
            self.frame,
            symbol,
            int(self.artifact["seq_len"]),
        )

    def custom_predict(self, symbol: str, sector: str, csv_text: str) -> dict:
        symbol = (symbol or "CUSTOM").upper().strip()
        sector = (sector or "Custom").strip()

        started_at = time.perf_counter()
        x_row, row, prices, context, note = stock_app.parse_custom_price_data(
            csv_text,
            self.artifact,
            symbol,
            sector,
        )
        explanation = stock_app.explain_one(self.artifact, x_row, row)
        natural = stock_app.build_natural_explanation(
            self.artifact,
            row,
            explanation,
            context,
            note,
        )

        return {
            "runtime": "python-model-custom",
            "elapsedMs": round((time.perf_counter() - started_at) * 1000),
            "symbol": symbol,
            "sector": sector,
            "date": row["date"],
            "adjClose": safe_float(row.get("adj_close"), 6),
            "futureClose": None,
            "futureReturn": None,
            "probabilityUp": safe_float(explanation["probability_up"], 6),
            "probabilityDown": safe_float(1.0 - float(explanation["probability_up"]), 6),
            "selectedThreshold": safe_float(explanation["selected_threshold"], 6),
            "predictedUp": int(explanation["predicted_up"]),
            "signalStrength": safe_float(explanation["signal_strength"], 6),
            "context": {
                key: safe_float(value, 6)
                for key, value in context.items()
                if isinstance(value, (int, float))
            },
            "topContributions": [
                {
                    "name": item.get("name"),
                    "label": item.get("label"),
                    "value": safe_float(item.get("value"), 6),
                    "kind": item.get("kind"),
                }
                for item in explanation["top_contributions"][:10]
            ],
            "naturalExplanation": natural,
            "priceSeries": [safe_float(value, 4) for value in prices.tolist()],
            "sourceNote": note,
        }

    def bootstrap(self) -> dict:
        return {
            "runtime": "python-model",
            "readyMs": self.ready_ms,
            "modelDir": str(MODEL_DIR),
            "meta": {
                "modelType": self.artifact.get("model_type"),
                "horizon": self.artifact.get("horizon"),
                "seqLen": self.artifact.get("seq_len"),
                "returnThreshold": self.artifact.get("return_threshold"),
                "labelMode": self.artifact.get("label_mode"),
                "baseRate": self.artifact.get("base_rate"),
            },
            "symbols": self.symbols,
            "metrics": self.metrics,
            "features": self.features,
            "backtest": self.backtest,
        }


runtime = ModelRuntime()


class Handler(BaseHTTPRequestHandler):
    server_version = "StockModelAPI/1.0"

    def log_message(self, format, *args):  # noqa: A002
        return

    def _write_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}
        body = self.rfile.read(length).decode("utf-8")
        return json.loads(body)

    def do_OPTIONS(self) -> None:
        self._write_json({"ok": True})

    def do_GET(self) -> None:
        try:
            parsed = urlparse(self.path)
            query = parse_qs(parsed.query)
            path = parsed.path.rstrip("/")

            if path == "/api/health":
                self._write_json({"ok": True, "readyMs": runtime.ready_ms})
                return

            if path == "/api/bootstrap":
                self._write_json(runtime.bootstrap())
                return

            if path == "/api/dates":
                symbol = query.get("symbol", [""])[0].upper()
                self._write_json({"symbol": symbol, "dates": runtime.available_dates(symbol)})
                return

            if path == "/api/predict":
                symbol = query.get("symbol", [""])[0].upper()
                date_text = query.get("date", [""])[0] or None
                if not symbol:
                    self._write_json(
                        {"error": "symbol query parameter is required"},
                        HTTPStatus.BAD_REQUEST,
                    )
                    return
                self._write_json(runtime.predict(symbol, date_text))
                return

            if path == "/api/sample-csv":
                symbol = query.get("symbol", [""])[0].upper()
                if not symbol:
                    self._write_json(
                        {"error": "symbol query parameter is required"},
                        HTTPStatus.BAD_REQUEST,
                    )
                    return
                self._write_json({"symbol": symbol, "csv": runtime.sample_csv(symbol)})
                return

            self._write_json({"error": f"Unknown endpoint: {parsed.path}"}, HTTPStatus.NOT_FOUND)
        except ValueError as exc:
            self._write_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
        except Exception as exc:  # noqa: BLE001
            self._write_json({"error": str(exc)}, HTTPStatus.INTERNAL_SERVER_ERROR)

    def do_POST(self) -> None:
        try:
            parsed = urlparse(self.path)
            path = parsed.path.rstrip("/")

            if path == "/api/custom-predict":
                payload = self._read_json_body()
                symbol = str(payload.get("symbol", "")).strip()
                sector = str(payload.get("sector", "")).strip()
                csv_text = str(payload.get("csv", ""))
                if not symbol:
                    self._write_json({"error": "symbol is required"}, HTTPStatus.BAD_REQUEST)
                    return
                if not csv_text.strip():
                    self._write_json({"error": "csv is required"}, HTTPStatus.BAD_REQUEST)
                    return
                self._write_json(runtime.custom_predict(symbol, sector, csv_text))
                return

            self._write_json({"error": f"Unknown endpoint: {parsed.path}"}, HTTPStatus.NOT_FOUND)
        except json.JSONDecodeError as exc:
            self._write_json({"error": f"Invalid JSON body: {exc}"}, HTTPStatus.BAD_REQUEST)
        except ValueError as exc:
            self._write_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
        except Exception as exc:  # noqa: BLE001
            self._write_json({"error": str(exc)}, HTTPStatus.INTERNAL_SERVER_ERROR)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(
        f"Stock model API ready at http://{HOST}:{PORT} "
        f"(loaded in {runtime.ready_ms}ms)",
        flush=True,
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
