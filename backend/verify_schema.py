
from sqlalchemy import inspect

from backend.app.database import engine, Base
from backend.app import models


def verify_database_schema():
    inspector = inspect(engine)

    database_tables = set(inspector.get_table_names())
    model_tables = set(Base.metadata.tables.keys())

    print("\n========== DATABASE SCHEMA VERIFICATION ==========")

    missing_tables = model_tables - database_tables
    extra_tables = database_tables - model_tables

    if missing_tables:
        print("Missing database tables:", sorted(missing_tables))

    if extra_tables:
        print("Additional database tables:", sorted(extra_tables))

    all_tables_match = not missing_tables

    for table_name, model_table in Base.metadata.tables.items():
        print(f"\nTable: {table_name}")

        if table_name not in database_tables:
            print("  NOT FOUND in database")
            continue

        database_columns = {
            column["name"]
            for column in inspector.get_columns(table_name)
        }

        model_columns = set(model_table.columns.keys())

        missing_columns = model_columns - database_columns
        extra_columns = database_columns - model_columns

        if missing_columns:
            print("  Missing columns:", sorted(missing_columns))

        if extra_columns:
            print("  Extra columns:", sorted(extra_columns))

        if not missing_columns and not extra_columns:
            print(f"  PASSED: All {len(model_columns)} columns match")
        else:
            all_tables_match = False

    print("\n===================================================")

    if all_tables_match:
        print("SUCCESS: All model tables and columns exist in MySQL.")
    else:
        print("WARNING: Differences were found. Review the output.")


if __name__ == "__main__":
    verify_database_schema()
