import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import json
import tempfile

# Регистрируем русский шрифт
try:
    font_paths = [
        '/System/Library/Fonts/Helvetica.ttc',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        'C:/Windows/Fonts/arial.ttf',
    ]
    
    font_registered = False
    for fp in font_paths:
        if os.path.exists(fp):
            if 'Helvetica' in fp:
                pdfmetrics.registerFont(TTFont('DejaVu', fp, subfontIndex=0))
            else:
                pdfmetrics.registerFont(TTFont('DejaVu', fp))
            font_registered = True
            break
            
except Exception as e:
    print(f"Font warning: {e}")

styles = getSampleStyleSheet()

try:
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontName='DejaVu',
        fontSize=24,
        textColor=colors.HexColor('#2C3E50'),
        spaceAfter=20,
        alignment=TA_CENTER,
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontName='DejaVu',
        fontSize=16,
        textColor=colors.HexColor('#34495E'),
        spaceAfter=12,
        spaceBefore=12,
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontName='DejaVu',
        fontSize=10,
        textColor=colors.HexColor('#2C3E50'),
        spaceAfter=8,
        leading=14,
    )
    
    small_style = ParagraphStyle(
        'CustomSmall',
        parent=styles['BodyText'],
        fontName='DejaVu',
        fontSize=9,
        textColor=colors.HexColor('#7F8C8D'),
        spaceAfter=6,
        leading=12,
    )
    
except:
    title_style = styles['Heading1']
    title_style.fontSize = 24
    title_style.textColor = colors.HexColor('#2C3E50')
    title_style.alignment = TA_CENTER
    
    heading_style = styles['Heading2']
    heading_style.fontSize = 16
    heading_style.textColor = colors.HexColor('#34495E')
    
    body_style = styles['BodyText']
    body_style.fontSize = 10
    body_style.textColor = colors.HexColor('#2C3E50')
    
    small_style = styles['BodyText']
    small_style.fontSize = 9
    small_style.textColor = colors.HexColor('#7F8C8D')


def create_radar_chart(normalized_scores, riasec, output_path):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5), subplot_kw=dict(projection='polar'))
    
    categories = ['O\nОткрытость', 'C\nОрганиз.', 'E\nКоммуник.', 'A\nЭмпатия', 'S\nСтресс']
    values = [normalized_scores['O'], normalized_scores['C'], normalized_scores['E'], 
              normalized_scores['A'], normalized_scores['S']]
    values += values[:1]
    
    angles = np.linspace(0, 2 * np.pi, len(categories), endpoint=False).tolist()
    angles += angles[:1]
    
    ax1.plot(angles, values, 'o-', linewidth=2, color='#3498DB')
    ax1.fill(angles, values, alpha=0.25, color='#3498DB')
    ax1.set_xticks(angles[:-1])
    ax1.set_xticklabels(categories, fontsize=8)
    ax1.set_ylim(0, 100)
    ax1.set_title('Big Five', fontsize=12, fontweight='bold', pad=20)
    ax1.grid(True)
    
    riasec_cat = ['R\nРеалист', 'I\nИсслед.', 'A\nАртист', 'S\nСоциал.', 'E\nПредпр.', 'C\nКонвен.']
    riasec_val = [riasec['R'], riasec['I'], riasec['A'], riasec['S'], riasec['E'], riasec['C']]
    riasec_val += riasec_val[:1]
    
    angles2 = np.linspace(0, 2 * np.pi, len(riasec_cat), endpoint=False).tolist()
    angles2 += angles2[:1]
    
    ax2.plot(angles2, riasec_val, 'o-', linewidth=2, color='#E74C3C')
    ax2.fill(angles2, riasec_val, alpha=0.25, color='#E74C3C')
    ax2.set_xticks(angles2[:-1])
    ax2.set_xticklabels(riasec_cat, fontsize=7)
    ax2.set_ylim(0, max(riasec_val) * 1.2 if max(riasec_val) > 0 else 100)
    ax2.set_title('RIASEC', fontsize=12, fontweight='bold', pad=20)
    ax2.grid(True)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close()


def create_professions_chart(top_professions, output_path):
    fig, ax = plt.subplots(figsize=(10, 5))
    
    titles = [p['title'] for p in top_professions[:5]]
    matches = [p['match'] for p in top_professions[:5]]
    
    titles_short = [t[:25] + '...' if len(t) > 25 else t for t in titles]
    
    bars = ax.barh(range(len(titles_short)), matches, color=['#E74C3C', '#3498DB', '#9B59B6', '#2ECC71', '#F39C12'])
    ax.set_yticks(range(len(titles_short)))
    ax.set_yticklabels(titles_short, fontsize=9)
    ax.set_xlim(0, 100)
    ax.set_xlabel('Совместимость (%)', fontsize=10)
    ax.set_title('Топ-5 профессий', fontsize=14, fontweight='bold', pad=15)
    ax.grid(axis='x', alpha=0.3)
    
    for i, (bar, match) in enumerate(zip(bars, matches)):
        ax.text(match + 1, i, f'{match}%', va='center', fontsize=9, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close()


def generate_pdf(user_data, normalized_scores, riasec, top_professions, details_list, output_path=None):
    if output_path is None:
        output_path = os.path.join(tempfile.gettempdir(), f'careercheck_{user_data.get("telegram_id", "user")}.pdf')
    
    radar_path = os.path.join(tempfile.gettempdir(), 'radar.png')
    bars_path = os.path.join(tempfile.gettempdir(), 'bars.png')
    
    create_radar_chart(normalized_scores, riasec, radar_path)
    create_professions_chart(top_professions, bars_path)
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
    )
    
    story = []
    
    story.append(Paragraph("CAREERCHECK", title_style))
    story.append(Paragraph("Персональный отчет о профпригодности", heading_style))
    story.append(Paragraph(f"Дата: {user_data.get('date', '---')} | {user_data.get('name', '---')}", small_style))
    story.append(Spacer(1, 20))
    
    story.append(Paragraph("Ваш профиль личности", heading_style))
    story.append(Image(radar_path, width=16*cm, height=6.5*cm))
    story.append(Spacer(1, 10))
    
    big_five_data = [
        ['Черта', 'Балл', 'Интерпретация'],
        ['Открытость (O)', f"{normalized_scores['O']}/100", 'Креативность, любопытство'],
        ['Организованность (C)', f"{normalized_scores['C']}/100", 'Дисциплина, планирование'],
        ['Коммуникация (E)', f"{normalized_scores['E']}/100", 'Экстраверсия, лидерство'],
        ['Эмпатия (A)', f"{normalized_scores['A']}/100", 'Забота о других'],
        ['Стрессоустойчивость (S)', f"{normalized_scores['S']}/100", 'Спокойствие под давлением'],
    ]
    
    big_five_table = Table(big_five_data, colWidths=[6*cm, 3*cm, 7*cm])
    big_five_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495E')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#ECF0F1')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#BDC3C7')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]))
    story.append(big_five_table)
    story.append(Spacer(1, 20))
    
    story.append(PageBreak())
    
    story.append(Paragraph("Рекомендуемые профессии", heading_style))
    story.append(Image(bars_path, width=14*cm, height=5.5*cm))
    story.append(Spacer(1, 15))
    
    for i, (prof, details) in enumerate(zip(top_professions[:3], details_list[:3]), 1):
        story.append(Paragraph(f"{i}. {prof['title']} — {prof['match']}%", heading_style))
        
        if details and details.get('reality'):
            story.append(Paragraph(f"<b>Реальность:</b> {details['reality'][:200]}...", body_style))
        
        if details:
            pros = details.get('pros', [])
            cons = details.get('cons', [])
            
            if pros:
                pros_text = "<b>Плюсы:</b> " + "; ".join(pros[:3])
                story.append(Paragraph(pros_text, small_style))
            
            if cons:
                cons_text = "<b>Минусы:</b> " + "; ".join(cons[:3])
                story.append(Paragraph(cons_text, small_style))
        
        story.append(Paragraph(f"<b>Перспективы:</b> {prof.get('growth', '---')}", small_style))
        story.append(Spacer(1, 10))
    
    story.append(Spacer(1, 20))
    story.append(Paragraph(
        "<i>Отчет основан на научной модели Big Five + RIASEC. "
        "Результат — не приговор, а отправная точка для развития.</i>", 
        small_style
    ))
    
    doc.build(story)
    
    for temp_file in [radar_path, bars_path]:
        if os.path.exists(temp_file):
            os.remove(temp_file)
    
    return output_path
