"""PDF layout constants for premium_pdf_generator.py."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm

W, H = A4
PAGE_MARGIN        = 18 * mm      # left/right margin (≈51pt)
HEADER_HEIGHT      = 44           # pt, from top of page to content start
FOOTER_HEIGHT      = 28           # pt, footer zone height from bottom
BODY_TOP           = H - PAGE_MARGIN - HEADER_HEIGHT
BODY_BOTTOM        = FOOTER_HEIGHT + 16   # minimum y for content

SECTION_GAP        = 18           # pt gap between end of text and next section header
HEADER_TEXT_GAP    = 6            # pt gap between section header and its text

HIGHLIGHT_PAD_TOP    = 14
HIGHLIGHT_PAD_BOTTOM = 14
HIGHLIGHT_PAD_LEFT   = 16
HIGHLIGHT_PAD_RIGHT  = 16

TRAIT_LABEL_WIDTH  = 110          # pt, fixed width for Big Five trait label column
BULLET_DOT_X       = 4           # pt offset from margin for bullet dot
BULLET_TEXT_X      = 14          # pt offset from margin for bullet text (gap = 10pt)
