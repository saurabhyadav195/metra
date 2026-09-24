"""
METRA Backend — app/services/pdf_service.py

Automated Report PDF Generation & Supabase Storage Integration Service.
Uses ReportLab to build pure-Python official OIML R-76 Laboratory Evaluation PDF certificates.

Enforces business invariants:
  - Preserves physical TESTING LABORATORY branding as primary letterhead.
  - Secondary attribution to METRA platform.
  - Filters test results to EXECUTED tests ONLY (excluding NOT_STARTED and NOT_APPLICABLE).
  - Preserves immutable sign-off metadata (Evaluator & Approver names/roles).
  - Stores binary PDF in Supabase Storage `metra-reports` bucket under tenant-scoped path:
    {laboratory_id}/reports/{evaluation_id}/v{version}.pdf
  - Updates `report_pdfs` PostgreSQL table metadata.
"""

from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import logging

import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Image as RLImage,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from supabase import Client

from app.deps import AuthenticatedUser
from app.services.report_service import ReportService

logger = logging.getLogger(__name__)

REPORTS_BUCKET = "metra-reports"


class ReportPdfGenerator:
    """Generates official OIML R-76 Laboratory Evaluation PDF certificates."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._custom_styles()

    def _custom_styles(self):
        # Base colors
        NAVY = colors.HexColor("#0F172A")
        SLATE_700 = colors.HexColor("#334155")
        SLATE_500 = colors.HexColor("#64748B")

        self.styles.add(ParagraphStyle(
            name="LabTitle",
            parent=self.styles["Heading1"],
            fontSize=16,
            leading=20,
            textColor=NAVY,
            fontName="Helvetica-Bold",
            alignment=0,
            spaceAfter=2,
        ))

        self.styles.add(ParagraphStyle(
            name="LabSubtitle",
            parent=self.styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=SLATE_700,
            fontName="Helvetica-Bold",
            spaceAfter=4,
        ))

        self.styles.add(ParagraphStyle(
            name="ReportHeaderRight",
            parent=self.styles["Normal"],
            fontSize=9,
            leading=13,
            textColor=NAVY,
            fontName="Helvetica-Bold",
            alignment=2,
        ))

        self.styles.add(ParagraphStyle(
            name="SectionHeading",
            parent=self.styles["Heading2"],
            fontSize=10,
            leading=14,
            textColor=NAVY,
            fontName="Helvetica-Bold",
            spaceBefore=10,
            spaceAfter=4,
            keepWithNext=True,
        ))

        self.styles.add(ParagraphStyle(
            name="MetaLabel",
            parent=self.styles["Normal"],
            fontSize=8,
            leading=10,
            textColor=SLATE_500,
            fontName="Helvetica",
        ))

        self.styles.add(ParagraphStyle(
            name="MetaVal",
            parent=self.styles["Normal"],
            fontSize=8.5,
            leading=11,
            textColor=NAVY,
            fontName="Helvetica-Bold",
        ))

        self.styles.add(ParagraphStyle(
            name="TableCell",
            parent=self.styles["Normal"],
            fontSize=8,
            leading=10,
            textColor=NAVY,
            fontName="Helvetica",
        ))

        self.styles.add(ParagraphStyle(
            name="TableCellBold",
            parent=self.styles["Normal"],
            fontSize=8,
            leading=10,
            textColor=NAVY,
            fontName="Helvetica-Bold",
        ))

        self.styles.add(ParagraphStyle(
            name="PassBadge",
            parent=self.styles["Normal"],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#065F46"),
            fontName="Helvetica-Bold",
            alignment=1,
        ))

        self.styles.add(ParagraphStyle(
            name="FailBadge",
            parent=self.styles["Normal"],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#991B1B"),
            fontName="Helvetica-Bold",
            alignment=1,
        ))

        self.styles.add(ParagraphStyle(
            name="ConformityText",
            parent=self.styles["Normal"],
            fontSize=8.5,
            leading=12,
            textColor=NAVY,
            fontName="Helvetica",
        ))

    def generate_pdf_bytes(self, data: Dict[str, Any]) -> bytes:
        """Renders report data into PDF binary bytes."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        story = []

        lab = data.get("laboratory") or {}
        eval_info = data.get("evaluation") or {}
        inst = data.get("instrument") or {}
        signoff = data.get("signoff") or {}
        test_results = data.get("test_results") or []

        # Filter test results to EXECUTED tests ONLY
        executed_tests = [
            tr for tr in test_results
            if str(tr.get("status", "")).upper() not in ("NOT_STARTED", "NOT_APPLICABLE")
        ]

        # ── 1. HEADER & LETTERHEAD ──────────────────────────────────────────
        lab_name = (lab.get("name") or "NATIONAL METROLOGY EVALUATION LABORATORY").upper()
        lab_address = lab.get("address") or ""
        accreditation = lab.get("accreditation_number") or lab.get("registration_number") or ""

        report_num = eval_info.get("report_number") or f"TR-{str(eval_info.get('id', ''))[:8].upper()}-2026"
        eval_num = eval_info.get("evaluation_number") or f"EVL-{str(eval_info.get('id', ''))[:8].upper()}"
        issue_date = eval_info.get("completed_at") or eval_info.get("evaluation_date") or ""

        header_left = [
            Paragraph(lab_name, self.styles["LabTitle"]),
            Paragraph("OIML R 76-1 TYPE EVALUATION CERTIFICATE", self.styles["LabSubtitle"]),
        ]
        if lab_address:
            header_left.append(Paragraph(lab_address, self.styles["MetaLabel"]))
        if accreditation:
            header_left.append(Paragraph(f"Accreditation / Registration No: <b>{accreditation}</b>", self.styles["MetaLabel"]))

        header_right = [
            Paragraph("<b>OFFICIAL EVALUATION CERTIFICATE</b>", self.styles["ReportHeaderRight"]),
            Paragraph(f"Report No: <b>{report_num}</b>", self.styles["ReportHeaderRight"]),
            Paragraph(f"Evaluation Ref: <b>{eval_num}</b>", self.styles["ReportHeaderRight"]),
            Paragraph(f"Issue Date: {issue_date[:10] if issue_date else '—'}", self.styles["MetaLabel"]),
        ]

        header_table = Table(
            [[header_left, header_right]],
            colWidths=[340, 180],
        )
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))

        story.append(header_table)
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0F172A"), spaceAfter=10))

        # ── SECTION 1: GENERAL INFORMATION ───────────────────────────────────
        story.append(Paragraph("1. General Information", self.styles["SectionHeading"]))

        sec1_grid = [
            [
                Paragraph("Applicant / Manufacturer:", self.styles["MetaLabel"]),
                Paragraph(str(inst.get("manufacturer") or "N/A"), self.styles["MetaVal"]),
                Paragraph("Instrument Category:", self.styles["MetaLabel"]),
                Paragraph("Non-Automatic Weighing Instrument (NAWI)", self.styles["MetaVal"]),
            ],
            [
                Paragraph("Model Designation:", self.styles["MetaLabel"]),
                Paragraph(str(inst.get("model") or "N/A"), self.styles["MetaVal"]),
                Paragraph("Serial Number:", self.styles["MetaLabel"]),
                Paragraph(str(inst.get("serial_number") or "N/A"), self.styles["MetaVal"]),
            ],
        ]
        sec1_table = Table(sec1_grid, colWidths=[130, 130, 130, 130])
        sec1_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(sec1_table)
        story.append(Spacer(1, 8))

        # ── SECTION 2: METROLOGICAL CHARACTERISTICS ─────────────────────────
        story.append(Paragraph("2. Metrological Characteristics", self.styles["SectionHeading"]))

        sec2_grid = [
            [
                Paragraph("Accuracy Class:", self.styles["MetaLabel"]),
                Paragraph(f"Class {inst.get('accuracy_class') or 'III'}", self.styles["MetaVal"]),
                Paragraph("Temperature Range:", self.styles["MetaLabel"]),
                Paragraph(f"{inst.get('temp_range_min', '-10')}°C to {inst.get('temp_range_max', '40')}°C", self.styles["MetaVal"]),
            ],
            [
                Paragraph("Maximum Capacity (Max):", self.styles["MetaLabel"]),
                Paragraph(f"{inst.get('max_capacity') or '15'} {inst.get('unit') or 'kg'}", self.styles["MetaVal"]),
                Paragraph("Minimum Capacity (Min):", self.styles["MetaLabel"]),
                Paragraph(f"{inst.get('min_capacity') or '0'} {inst.get('unit') or 'kg'}", self.styles["MetaVal"]),
            ],
            [
                Paragraph("Verification Scale Interval (e):", self.styles["MetaLabel"]),
                Paragraph(f"{inst.get('verification_scale_interval') or '5'} g", self.styles["MetaVal"]),
                Paragraph("Actual Scale Interval (d):", self.styles["MetaLabel"]),
                Paragraph(f"{inst.get('actual_scale_interval') or '5'} g", self.styles["MetaVal"]),
            ],
        ]
        sec2_table = Table(sec2_grid, colWidths=[130, 130, 130, 130])
        sec2_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(sec2_table)
        story.append(Spacer(1, 8))

        # ── SECTION 3: ENVIRONMENTAL CONDITIONS ───────────────────────────
        story.append(Paragraph("3. Environmental Conditions", self.styles["SectionHeading"]))
        env = eval_info.get("environmental_conditions") or {}
        env_grid_data = [[
            Paragraph("Temperature:", self.styles["MetaLabel"]),
            Paragraph(f"{env.get('temperature_c', '20.0')} °C", self.styles["MetaVal"]),
            Paragraph("Relative Humidity:", self.styles["MetaLabel"]),
            Paragraph(f"{env.get('relative_humidity_percent') or env.get('relative_humidity_pct') or '50'} %", self.styles["MetaVal"]),
            Paragraph("Atmospheric Pressure:", self.styles["MetaLabel"]),
            Paragraph(f"{env.get('atmospheric_pressure_hpa', '1013.25')} hPa", self.styles["MetaVal"]),
        ]]
        env_table = Table(env_grid_data, colWidths=[80, 90, 90, 80, 90, 90])
        env_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(env_table)
        story.append(Spacer(1, 8))

        # ── SECTION 4: SUMMARY OF CONFORMITY ───────────────────────────────
        story.append(Paragraph("4. Summary of Conformity", self.styles["SectionHeading"]))

        test_table_data = [[
            Paragraph("OIML Clause", self.styles["TableCellBold"]),
            Paragraph("Test Title", self.styles["TableCellBold"]),
            Paragraph("Applied Requirement", self.styles["TableCellBold"]),
            Paragraph("Status", self.styles["TableCellBold"]),
            Paragraph("Compliance", self.styles["TableCellBold"]),
        ]]

        if not executed_tests:
            test_table_data.append([
                Paragraph("—", self.styles["TableCell"]),
                Paragraph("No test procedures executed for this evaluation.", self.styles["TableCell"]),
                Paragraph("—", self.styles["TableCell"]),
                Paragraph("UNEXECUTED", self.styles["TableCell"]),
                Paragraph("—", self.styles["TableCell"]),
            ])
        else:
            for tr in executed_tests:
                status_str = str(tr.get("status", "PASS")).upper()
                res_str = str(tr.get("manual_result") or status_str).upper()
                badge_style = self.styles["PassBadge"] if res_str == "PASS" else self.styles["FailBadge"]

                test_table_data.append([
                    Paragraph(str(tr.get("clause") or "A.4"), self.styles["TableCellBold"]),
                    Paragraph(str(tr.get("test_name") or tr.get("test_id")), self.styles["TableCell"]),
                    Paragraph(str(tr.get("summary_message") or "OIML R 76-1 Error Limits"), self.styles["TableCell"]),
                    Paragraph(status_str, self.styles["TableCell"]),
                    Paragraph(res_str, badge_style),
                ])

        results_table = Table(test_table_data, colWidths=[65, 175, 170, 55, 55])
        results_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(results_table)
        story.append(Spacer(1, 10))

        # Conformity Determination Box
        overall_status_str = str(
            (eval_info.get("overall_result") or {}).get("status")
            if isinstance(eval_info.get("overall_result"), dict)
            else eval_info.get("overall_result") or eval_info.get("status") or "PENDING"
        ).lower()

        is_conforming = overall_status_str in ("pass", "passed")

        conformity_text = (
            f"This is to certify that the non-automatic weighing instrument model <b>{inst.get('model', 'N/A')}</b> "
            f"(Serial No: <b>{inst.get('serial_number', 'N/A')}</b>) manufactured by <b>{inst.get('manufacturer', 'N/A')}</b> "
            f"has been evaluated in accordance with <b>OIML R 76-1:2006 (E)</b> procedures. "
            f"Based on laboratory test observations and calculated error margins, the instrument is determined to "
            f"<b>{'COMPLY WITH OIML R 76-1' if is_conforming else 'REQUIRE REWORK / NON-COMPLIANT'}</b>."
        )

        bg_color = colors.HexColor("#ECFDF5") if is_conforming else colors.HexColor("#FEF3C7")
        border_color = colors.HexColor("#A7F3D0") if is_conforming else colors.HexColor("#FDE68A")

        conf_table = Table([[Paragraph(conformity_text, self.styles["ConformityText"])]], colWidths=[520])
        conf_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg_color),
            ("BOX", (0, 0), (-1, -1), 1, border_color),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(conf_table)
        story.append(Spacer(1, 10))

        # ── SECTION 5: OFFICIAL DECLARATION & SIGN-OFF WITH QR CODE ────────
        evaluator_name = signoff.get("evaluator_name") or "Testing Engineer"
        evaluator_role = signoff.get("evaluator_role") or "Testing Engineer / Metrologist"
        eval_date = signoff.get("evaluated_at") or issue_date

        approver_name = signoff.get("approver_name") or "Pending Approval"
        approver_role = signoff.get("approver_role") or "Authorized Quality Manager"
        approval_status = signoff.get("approval_status") or "PENDING_VERIFICATION"
        app_date = signoff.get("approved_at") or "__________________"

        # Conditionally generate QR Code image ONLY for approved official reports
        eval_id = str(eval_info.get("id") or "")
        verify_url = f"https://metra-kappa.vercel.app/verify/{eval_id}"
        
        if approval_status == "APPROVED":
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=4,
                border=2,
            )
            qr.add_data(verify_url)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white")
            qr_buf = io.BytesIO()
            # pyre-ignore[unexpected-keyword]
            qr_img.save(qr_buf, format="PNG")
            qr_buf.seek(0)
            qr_flowable = RLImage(qr_buf, width=0.95 * inch, height=0.95 * inch)
        else:
            qr_flowable = Paragraph(
                "<i>Verification QR Code issued upon official approval</i>",
                self.styles["MetaLabel"]
            )

        eval_box_content = [
            Paragraph("<b>EVALUATED BY:</b>", self.styles["MetaLabel"]),
            Spacer(1, 8),
            Paragraph(f"<i>{evaluator_name}</i>", self.styles["TableCellBold"]),
            HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94A3B8"), spaceAfter=4),
            Paragraph(f"Name: <b>{evaluator_name}</b>", self.styles["MetaLabel"]),
            Paragraph(f"Role: {evaluator_role}", self.styles["MetaLabel"]),
            Paragraph(f"Date: {eval_date[:10] if eval_date else '—'}", self.styles["MetaLabel"]),
        ]

        app_text_flowables = [
            Paragraph(f"<b>APPROVED & VERIFIED BY:</b>", self.styles["MetaLabel"]),
            Paragraph(f"<b>[{approval_status}]</b>", self.styles["MetaVal"]),
            Spacer(1, 4),
            Paragraph(f"<i>{approver_name if approval_status == 'APPROVED' else 'Pending Verification Signature'}</i>", self.styles["TableCellBold"]),
            HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94A3B8"), spaceAfter=4),
            Paragraph(f"Name: <b>{approver_name}</b>", self.styles["MetaLabel"]),
            Paragraph(f"Role: {approver_role}", self.styles["MetaLabel"]),
            Paragraph(f"Date: {app_date[:10] if app_date and app_date != '__________________' else '—'}", self.styles["MetaLabel"]),
        ]

        # Put approver text and QR code side-by-side in right box
        app_sub_table = Table([[app_text_flowables, qr_flowable]], colWidths=[150, 80])
        app_sub_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))

        sign_table = Table([[eval_box_content, app_sub_table]], colWidths=[250, 250])
        sign_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))

        footer_text = (
            f"Generated using METRA — Metrology Evaluation & Test Report Automation"
            if approval_status != "APPROVED"
            else f"Generated using METRA — Metrology Evaluation & Test Report Automation | Verification URL: {verify_url}"
        )

        story.append(KeepTogether([
            Paragraph("5. Official Declaration & Laboratory Sign-off", self.styles["SectionHeading"]),
            sign_table,
            Spacer(1, 10),
            HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceAfter=4),
            Paragraph(footer_text, self.styles["MetaLabel"])
        ]))

        def _add_page_footer(canvas, doc):
            canvas.saveState()
            canvas.setFont("Helvetica", 8)
            canvas.setFillColor(colors.HexColor("#64748B"))
            canvas.drawString(36, 20, "Powered by METRA — Automated Legal Metrology System")
            canvas.drawRightString(A4[0] - 36, 20, f"Page {doc.page}")
            canvas.restoreState()

        doc.build(story, onFirstPage=_add_page_footer, onLaterPages=_add_page_footer)
        return buffer.getvalue()


async def generate_and_store_report_pdf(
    client: Client,
    evaluation_id: str,
    caller: AuthenticatedUser
) -> Dict[str, Any]:
    """
    Assembles report data, builds PDF in memory using ReportLab,
    uploads to Supabase Storage `metra-reports` bucket, and saves metadata in `report_pdfs`.
    """
    # 1. Assemble comprehensive report payload
    report_service = ReportService(client)
    report_data = await report_service.get_report_data(evaluation_id, caller)

    # 2. Render PDF bytes
    pdf_gen = ReportPdfGenerator()
    pdf_bytes = pdf_gen.generate_pdf_bytes(report_data)

    # 3. Determine version number
    existing = (
        client.table("report_pdfs")
        .select("version")
        .eq("evaluation_id", evaluation_id)
        .eq("laboratory_id", caller.laboratory_id)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    next_version = 1
    if existing.data:
        next_version = (existing.data[0].get("version") or 0) + 1

    file_name = f"report_v{next_version}.pdf"
    storage_path = f"{caller.laboratory_id}/reports/{evaluation_id}/{file_name}"

    # 4. Upload binary PDF bytes to Supabase Storage
    try:
        # Use storage API upsert
        res = client.storage.from_(REPORTS_BUCKET).upload(
            file=pdf_bytes,
            path=storage_path,
            file_options={"content-type": "application/pdf", "upsert": "true"}
        )
    except Exception as e:
        logger.error(f"Failed to upload report PDF to storage path {storage_path}: {e}")
        # Best-effort retry or fallback if file exists
        try:
            client.storage.from_(REPORTS_BUCKET).update(
                file=pdf_bytes,
                path=storage_path,
                file_options={"content-type": "application/pdf"}
            )
        except Exception as retry_err:
            logger.error(f"Storage update retry also failed: {retry_err}")
            raise RuntimeError(f"Failed to upload report PDF to Supabase Storage: {str(e)}")

    # 5. Mark previous versions as non-current in DB
    client.table("report_pdfs").update({"is_current": False}).eq("evaluation_id", evaluation_id).execute()

    # 6. Insert new current version metadata
    now_str = datetime.now(timezone.utc).isoformat()
    evaluator_user_id = report_data.get("signoff", {}).get("evaluator_user_id") or caller.user_id
    db_row = {
        "laboratory_id": caller.laboratory_id,
        "evaluation_id": evaluation_id,
        "generated_by": evaluator_user_id,
        "storage_path": storage_path,
        "file_name": file_name,
        "file_size": len(pdf_bytes),
        "version": next_version,
        "is_current": True,
        "generated_at": now_str,
    }

    insert_res = client.table("report_pdfs").insert(db_row).select("*").execute()
    if not insert_res.data:
        raise RuntimeError("Failed to insert report PDF metadata into report_pdfs table.")

    logger.info(f"Successfully generated and stored official report PDF: {storage_path} (version {next_version})")

    return {
        "storage_path": storage_path,
        "version": next_version,
        "file_name": file_name,
        "size": len(pdf_bytes),
    }
