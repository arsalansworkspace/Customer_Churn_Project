from pathlib import Path
from decimal import Decimal

import pandas as pd
from sqlalchemy import func, select

from backend.app.database import SessionLocal
from backend.app.models.customer import Customer
from backend.app.models.dataset import Dataset


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

PROJECT_DIR = Path(__file__).resolve().parent
CSV_PATH = PROJECT_DIR / "Telco-Customer-Churn.csv"

DATASET_NAME = "Telco Customer Churn Dataset"
ORIGINAL_FILENAME = "Telco-Customer-Churn.csv"


# --------------------------------------------------
# HELPER FUNCTIONS
# --------------------------------------------------

def clean_text(value):
    if pd.isna(value):
        return None
    return str(value).strip()


def to_decimal(value):
    if pd.isna(value):
        return None
    return Decimal(str(value)).quantize(Decimal("0.01"))


# --------------------------------------------------
# CHECK CSV FILE
# --------------------------------------------------

if not CSV_PATH.exists():
    raise FileNotFoundError(f"Dataset not found: {CSV_PATH}")

print("Reading original Telco dataset...")

df = pd.read_csv(
    CSV_PATH,
    dtype={"customerID": "string"}
)

required_columns = [
    "customerID",
    "gender",
    "SeniorCitizen",
    "Partner",
    "Dependents",
    "tenure",
    "PhoneService",
    "MultipleLines",
    "InternetService",
    "OnlineSecurity",
    "OnlineBackup",
    "DeviceProtection",
    "TechSupport",
    "StreamingTV",
    "StreamingMovies",
    "Contract",
    "PaperlessBilling",
    "PaymentMethod",
    "MonthlyCharges",
    "TotalCharges",
    "Churn",
]

missing_columns = set(required_columns) - set(df.columns)

if missing_columns:
    raise ValueError(
        f"Missing CSV columns: {sorted(missing_columns)}"
    )

if df["customerID"].duplicated().any():
    raise ValueError("Duplicate customer IDs found.")

# Clean text columns.
text_columns = [
    "customerID",
    "gender",
    "Partner",
    "Dependents",
    "PhoneService",
    "MultipleLines",
    "InternetService",
    "OnlineSecurity",
    "OnlineBackup",
    "DeviceProtection",
    "TechSupport",
    "StreamingTV",
    "StreamingMovies",
    "Contract",
    "PaperlessBilling",
    "PaymentMethod",
    "Churn",
]

for column in text_columns:
    df[column] = df[column].map(clean_text)

# Convert numeric columns.
df["SeniorCitizen"] = pd.to_numeric(
    df["SeniorCitizen"], errors="coerce"
)

df["tenure"] = pd.to_numeric(
    df["tenure"], errors="coerce"
)

df["MonthlyCharges"] = pd.to_numeric(
    df["MonthlyCharges"], errors="coerce"
)

# Blank TotalCharges values become NaN and then SQL NULL.
df["TotalCharges"] = pd.to_numeric(
    df["TotalCharges"].astype("string").str.strip(),
    errors="coerce"
)

if df[
    ["SeniorCitizen", "tenure", "MonthlyCharges"]
].isna().any().any():
    raise ValueError("Invalid values found in required numeric columns.")

if not df["Churn"].isin(["Yes", "No"]).all():
    raise ValueError("Unexpected churn labels found.")

if (df["MonthlyCharges"] < 0).any():
    raise ValueError("Negative monthly charges found.")

if (df["TotalCharges"].dropna() < 0).any():
    raise ValueError("Negative total charges found.")

invalid_total_charges = int(df["TotalCharges"].isna().sum())

print(f"Total CSV records: {len(df)}")
print(f"Blank TotalCharges values: {invalid_total_charges}")


# --------------------------------------------------
# PREPARE CUSTOMER RECORDS
# --------------------------------------------------

print("Preparing customer records...")

customer_records = []

for row in df.to_dict(orient="records"):

    customer = Customer(
        customer_code=row["customerID"],
        gender=row["gender"],
        senior_citizen=int(row["SeniorCitizen"]),
        partner=row["Partner"],
        dependents=row["Dependents"],
        tenure=int(row["tenure"]),

        phone_service=row["PhoneService"],
        multiple_lines=row["MultipleLines"],
        internet_service=row["InternetService"],
        online_security=row["OnlineSecurity"],
        online_backup=row["OnlineBackup"],
        device_protection=row["DeviceProtection"],
        tech_support=row["TechSupport"],
        streaming_tv=row["StreamingTV"],
        streaming_movies=row["StreamingMovies"],

        contract=row["Contract"],
        paperless_billing=row["PaperlessBilling"],
        payment_method=row["PaymentMethod"],

        monthly_charges=to_decimal(row["MonthlyCharges"]),
        total_charges=to_decimal(row["TotalCharges"]),

        churn_status=row["Churn"],
    )

    customer_records.append(customer)


# --------------------------------------------------
# IMPORT INTO MYSQL
# --------------------------------------------------

print("\nStarting MySQL import...")

dataset_id = None

try:
    with SessionLocal.begin() as db:

        # Protect against accidental duplicate imports.
        existing_customers = db.scalar(
            select(func.count()).select_from(Customer)
        ) or 0

        existing_datasets = db.scalar(
            select(func.count()).select_from(Dataset)
        ) or 0

        if existing_customers > 0 or existing_datasets > 0:
            raise RuntimeError(
                "Import stopped: customers or datasets already exist. "
                "Check the database before importing again."
            )

        # Create dataset tracking record.
        dataset = Dataset(
            dataset_name=DATASET_NAME,
            original_filename=ORIGINAL_FILENAME,
            file_path=str(CSV_PATH.resolve()),
            total_rows=len(customer_records),
            imported_rows=0,
            status="processing",
        )

        db.add(dataset)
        db.flush()

        dataset_id = dataset.id

        # Link every customer to the imported dataset.
        for customer in customer_records:
            customer.dataset_id = dataset_id

        db.add_all(customer_records)
        db.flush()

        # Mark dataset import as completed.
        dataset.imported_rows = len(customer_records)
        dataset.status = "completed"

    # Reaching here means the transaction committed.
    print("\nIMPORT SUCCESSFUL")
    print("------------------------------")
    print(f"Dataset ID: {dataset_id}")
    print(f"Customers imported: {len(customer_records)}")
    print(f"Blank TotalCharges: {invalid_total_charges}")
    print("Dataset status: completed")

except Exception as error:
    print("\nIMPORT FAILED")
    print("The database transaction was rolled back.")
    print("ERROR:", str(error))
    raise

