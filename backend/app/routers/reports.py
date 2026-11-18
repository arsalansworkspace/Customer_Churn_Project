
import csv
from datetime import date, datetime
from io import BytesIO, StringIO

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.customer import Customer
from backend.app.models.prediction import Prediction
from backend.app.models.retention_action import RetentionAction
from backend.app.utils.security import get_current_user


router = APIRouter(
    prefix="/api/reports",
    tags=["Reports"],
    dependencies=[Depends(get_current_user)]
)


def get_latest_predictions(db: Session):
    """Get the latest prediction for each customer."""

    latest_ids = (
        db.query(
            func.max(Prediction.id).label("latest_id")
        )
        .group_by(Prediction.customer_id)
        .subquery()
    )

    return (
        db.query(Prediction, Customer)
        .join(
            latest_ids,
            Prediction.id == latest_ids.c.latest_id
        )
        .join(
            Customer,
            Prediction.customer_id == Customer.id
        )
        .all()
    )


def format_value(value):
    """Convert database values into export-friendly values."""

    if value is None:
        return ""

    if isinstance(value, (datetime, date)):
        return value.strftime("%Y-%m-%d %H:%M:%S")

    return value


def get_customer_data(db: Session):
    customers = (
        db.query(Customer)
        .order_by(Customer.id.asc())
        .all()
    )

    columns = [
        "id",
        "customer_code",
        "gender",
        "senior_citizen",
        "partner",
        "dependents",
        "tenure",
        "phone_service",
        "multiple_lines",
        "internet_service",
        "online_security",
        "online_backup",
        "device_protection",
        "tech_support",
        "streaming_tv",
        "streaming_movies",
        "contract",
        "paperless_billing",
        "payment_method",
        "monthly_charges",
        "total_charges",
        "churn_status",
        "dataset_id",
        "created_at",
        "updated_at",
    ]

    rows = []

    for customer in customers:
        rows.append([
            format_value(getattr(customer, column))
            for column in columns
        ])

    return columns, rows


def get_prediction_data(db: Session):
    records = (
        db.query(Prediction, Customer)
        .join(
            Customer,
            Prediction.customer_id == Customer.id
        )
        .order_by(
            Prediction.created_at.desc(),
            Prediction.id.desc()
        )
        .all()
    )

    columns = [
        "prediction_id",
        "customer_id",
        "customer_code",
        "churn_probability",
        "threshold",
        "prediction",
        "risk_level",
        "model_version_id",
        "created_at",
    ]

    rows = []

    for prediction, customer in records:
        rows.append([
            prediction.id,
            customer.id,
            customer.customer_code,
            float(prediction.churn_probability) * 100,
            float(prediction.threshold) * 100,
            prediction.prediction,
            prediction.risk_level,
            prediction.model_version_id,
            format_value(prediction.created_at),
        ])

    return columns, rows


def get_retention_action_data(db: Session):
    records = (
        db.query(RetentionAction, Customer)
        .join(
            Customer,
            RetentionAction.customer_id == Customer.id
        )
        .order_by(RetentionAction.created_at.desc())
        .all()
    )

    columns = [
        "action_id",
        "customer_id",
        "customer_code",
        "assigned_to",
        "action_type",
        "description",
        "priority",
        "status",
        "outcome",
        "due_date",
        "completed_at",
        "created_at",
        "updated_at",
    ]

    rows = []

    for action, customer in records:
        rows.append([
            action.id,
            customer.id,
            customer.customer_code,
            action.assigned_to,
            action.action_type,
            action.description,
            action.priority,
            action.status,
            action.outcome,
            format_value(action.due_date),
            format_value(action.completed_at),
            format_value(action.created_at),
            format_value(action.updated_at),
        ])

    return columns, rows


def create_csv_response(columns, rows, filename):
    output = StringIO()
    writer = csv.writer(output)

    writer.writerow(columns)
    writer.writerows(rows)

    content = output.getvalue().encode("utf-8-sig")

    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            )
        }
    )


@router.get("/customers.csv")
def export_customers_csv(
    db: Session = Depends(get_db)
):
    columns, rows = get_customer_data(db)

    return create_csv_response(
        columns,
        rows,
        "churnguard_customers.csv"
    )


@router.get("/predictions.csv")
def export_predictions_csv(
    db: Session = Depends(get_db)
):
    columns, rows = get_prediction_data(db)

    return create_csv_response(
        columns,
        rows,
        "churnguard_predictions.csv"
    )


@router.get("/excel")
def export_excel(
    db: Session = Depends(get_db)
):
    customer_columns, customer_rows = get_customer_data(db)
    prediction_columns, prediction_rows = get_prediction_data(db)
    action_columns, action_rows = get_retention_action_data(db)

    workbook = Workbook()

    # Create three worksheets.
    sheets = [
        ("Customers", customer_columns, customer_rows),
        ("Predictions", prediction_columns, prediction_rows),
        ("Retention Actions", action_columns, action_rows),
    ]

    header_fill = PatternFill(
        fill_type="solid",
        fgColor="2563EB"
    )

    for sheet_name, columns, rows in sheets:
        worksheet = (
            workbook.active
            if sheet_name == "Customers"
            else workbook.create_sheet(sheet_name)
        )

        worksheet.title = sheet_name
        worksheet.append(columns)

        for row in rows:
            worksheet.append(row)

        # Format header.
        for cell in worksheet[1]:
            cell.font = Font(
                bold=True,
                color="FFFFFF"
            )
            cell.fill = header_fill
            cell.alignment = Alignment(
                horizontal="center",
                vertical="center"
            )

        worksheet.freeze_panes = "A2"
        worksheet.auto_filter.ref = worksheet.dimensions

        # Adjust column widths.
        for column_cells in worksheet.columns:
            max_length = max(
                len(str(cell.value or ""))
                for cell in column_cells
            )

            column_letter = get_column_letter(
                column_cells[0].column
            )

            worksheet.column_dimensions[
                column_letter
            ].width = min(max(max_length + 2, 12), 35)

    output = BytesIO()
    workbook.save(output)
    output.seek(0)

    return Response(
        content=output.getvalue(),
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": (
                'attachment; filename="churnguard_report.xlsx"'
            )
        }
    )


@router.get("/pdf")
def export_pdf(
    db: Session = Depends(get_db)
):
    # Database KPIs.
    total_customers = (
        db.query(func.count(Customer.id)).scalar() or 0
    )

    churned_customers = (
        db.query(func.count(Customer.id))
        .filter(Customer.churn_status == "Yes")
        .scalar() or 0
    )

    retained_customers = (
        db.query(func.count(Customer.id))
        .filter(Customer.churn_status == "No")
        .scalar() or 0
    )

    unknown_customers = (
        db.query(func.count(Customer.id))
        .filter(Customer.churn_status == "Unknown")
        .scalar() or 0
    )

    churn_rate = (
        (churned_customers / total_customers) * 100
        if total_customers else 0
    )

    total_predictions = (
        db.query(func.count(Prediction.id)).scalar() or 0
    )

    latest_records = get_latest_predictions(db)

    risk_counts = {
        "High": 0,
        "Medium": 0,
        "Low": 0,
    }

    for prediction, customer in latest_records:
        if prediction.risk_level in risk_counts:
            risk_counts[prediction.risk_level] += 1

    # Highest probability customers first.
    latest_records.sort(
        key=lambda record: float(
            record[0].churn_probability
        ),
        reverse=True
    )

    output = BytesIO()

    document = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=22,
        textColor=colors.HexColor("#1D4ED8"),
        alignment=TA_CENTER,
        spaceAfter=8,
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        alignment=TA_CENTER,
        textColor=colors.HexColor("#64748B"),
        spaceAfter=18,
    )

    section_style = ParagraphStyle(
        "SectionTitle",
        parent=styles["Heading2"],
        textColor=colors.HexColor("#1E40AF"),
        spaceBefore=14,
        spaceAfter=8,
    )

    story = []

    story.append(
        Paragraph("ChurnGuard AI", title_style)
    )

    story.append(
        Paragraph(
            "Customer Intelligence & Churn Analytics Report",
            subtitle_style
        )
    )

    story.append(
        Paragraph(
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            subtitle_style
        )
    )

    # KPI table.
    story.append(
        Paragraph("Customer Overview", section_style)
    )

    kpi_data = [
        ["Total Customers", "Churned", "Retained", "Unknown", "Churn Rate"],
        [
            str(total_customers),
            str(churned_customers),
            str(retained_customers),
            str(unknown_customers),
            f"{churn_rate:.2f}%",
        ],
    ]

    kpi_table = Table(
        kpi_data,
        colWidths=[48 * mm] * 5
    )

    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#DBEAFE")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1E40AF")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("PADDING", (0, 0), (-1, -1), 9),
    ]))

    story.append(kpi_table)
    story.append(Spacer(1, 10))

    # Prediction overview.
    story.append(
        Paragraph("Prediction Overview", section_style)
    )

    prediction_summary = [
        ["Total Prediction Records", "Customers with Latest Predictions"],
        [
            str(total_predictions),
            str(len(latest_records)),
        ],
    ]

    prediction_table = Table(
        prediction_summary,
        colWidths=[120 * mm, 120 * mm]
    )

    prediction_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#DBEAFE")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))

    story.append(prediction_table)

    # Risk distribution.
    story.append(
        Paragraph("Latest Prediction Risk Distribution", section_style)
    )

    risk_data = [
        ["Risk Level", "Customers"],
        ["High", str(risk_counts["High"])],
        ["Medium", str(risk_counts["Medium"])],
        ["Low", str(risk_counts["Low"])],
    ]

    risk_table = Table(
        risk_data,
        colWidths=[80 * mm, 80 * mm]
    )

    risk_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#DBEAFE")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("PADDING", (0, 0), (-1, -1), 7),
    ]))

    story.append(risk_table)

    # Highest-risk customer details.
    story.append(
        Paragraph(
            "Highest-Risk Customers (Latest Predictions)",
            section_style
        )
    )

    customer_data = [[
        "Customer Code",
        "Tenure",
        "Contract",
        "Monthly Charges",
        "Churn Probability",
        "Risk Level",
        "Prediction",
    ]]

    for prediction, customer in latest_records[:25]:
        customer_data.append([
            customer.customer_code,
            str(customer.tenure or 0),
            str(customer.contract or ""),
            f"{float(customer.monthly_charges or 0):.2f}",
            f"{float(prediction.churn_probability) * 100:.2f}%",
            prediction.risk_level,
            prediction.prediction,
        ])

    customer_table = Table(
        customer_data,
        repeatRows=1,
        colWidths=[
            35 * mm,
            18 * mm,
            35 * mm,
            30 * mm,
            35 * mm,
            25 * mm,
            30 * mm,
        ]
    )

    customer_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
            colors.white,
            colors.HexColor("#F1F5F9"),
        ]),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))

    story.append(customer_table)

    story.append(Spacer(1, 15))

    story.append(
        Paragraph(
            "This report was generated from the current ChurnGuard AI "
            "MySQL database. Risk distribution uses the latest saved "
            "prediction for each customer.",
            styles["Italic"]
        )
    )

    document.build(story)

    output.seek(0)

    return Response(
        content=output.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                'attachment; filename="churnguard_analytics_report.pdf"'
            )
        }
    )
