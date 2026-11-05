"""ATCO brand pass for every downloadable workbook.

Brand: five-block ATCO logo, purple/orange/green/blue/red stripe, uppercase headings.
Open Sans and Roboto are not installed with Office, so workbooks use Arial (the
closest font every Excel install has). Modeling conventions stay: blue inputs,
black formulas, yellow key output.
"""
from __future__ import annotations

from pathlib import Path

from openpyxl.drawing.image import Image
from openpyxl.styles import Border, Side

PURPLE, ORANGE, GREEN, BLUE, RED = "FF403393", "FFF7901E", "FF76B96A", "FF3D86C6", "FFBB2034"
STRIPE = [PURPLE, ORANGE, GREEN, BLUE, RED]
INK = "FF292929"
FONT = "Arial"
LOGO = Path(__file__).resolve().parent.parent / "public" / "brand" / "atco-logo.png"
LOGO_H = 46  # px
STRIPE_COLS = 18  # stripe spans at most this many columns from B


def brand(wb, footer: str = "ATCO Properties & Management · Confidential · Screening model, not an appraisal or offer"):
    """Row 1 of every sheet: the ATCO logo over a five-colour stripe. Rows 2+ are untouched."""
    wb.properties.creator = "ATCO Properties & Management"
    wb.properties.lastModifiedBy = "ATCO Properties & Management"
    for ws in wb.worksheets:
        ws.row_dimensions[1].height = 40
        img = Image(str(LOGO))
        img.height = LOGO_H
        img.width = round(LOGO_H * 655 / 322)
        ws.add_image(img, "B1")
        last = max(6, min(ws.max_column, 1 + STRIPE_COLS))  # at least five cells so all five colours show
        cols = list(range(2, last + 1))
        n = len(cols)
        for i, c in enumerate(cols):
            colour = STRIPE[min(4, i * 5 // n)]
            ws.cell(row=1, column=c).border = Border(bottom=Side(style="thick", color=colour))
        ws.oddFooter.left.text = footer
        ws.oddFooter.left.font = FONT
        ws.oddFooter.left.size = 8
        ws.oddFooter.right.text = "Page &P of &N"
        ws.oddFooter.right.font = FONT
        ws.oddFooter.right.size = 8
        ws.oddHeader.right.text = "ATCO SENIOR LIVING"
        ws.oddHeader.right.font = f"{FONT},Bold"
        ws.oddHeader.right.size = 8
        ws.oddHeader.right.color = PURPLE[2:]
    return wb

