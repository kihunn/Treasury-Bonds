# app.py
from flask import Flask, jsonify, request
import requests

app = Flask(__name__)

BASE_API_URL = (
    "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/"
    "v1/accounting/od/rates_of_exchange"
)

@app.route("/api/bond-rates?currenecy=", methods=["GET"])
def get_bond_rates():
    currency = request.args.get("currency")           # e.g. Canada-Dollar
    latest_only = request.args.get("latest_only")     # "true" or None

    fields = "fields=country_currency_desc,exchange_rate,record_date"
    filter_parts = ["record_date:gte:2024-01-01"]

    if currency:
        filter_parts.append(f"country_currency_desc:eq:{currency}")

    filters = "&filter=" + ",".join(filter_parts)
    sort = "&sort=-record_date" if latest_only else ""
    page = "&page[size]=1" if latest_only else "&page[size]=100"
    full_url = f"{BASE_API_URL}?{fields}{filters}{sort}{page}"

    try:
        response = requests.get(full_url, timeout=10)
        response.raise_for_status()
        return jsonify(response.json()["data"])
    except requests.exceptions.RequestException as e:
        return jsonify({"error": "Failed to fetch data", "details": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
