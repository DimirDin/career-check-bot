import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.calculator import calculate_scores, calculate_riasec, match_professions
import asyncio
import asyncpg
import json
from config.settings import DB_CONFIG

async def get_professions():
    conn = await asyncpg.connect(**DB_CONFIG)
    try:
        rows = await conn.fetch('SELECT id, title, description, required_traits, riasec_type, growth_potential FROM professions')
        result = []
        for row in rows:
            d = dict(row)
            if isinstance(d.get('required_traits'), str):
                d['required_traits'] = json.loads(d['required_traits'])
            result.append(d)
        return result
    finally:
        await conn.close()

def make_answers(pattern):
    answers = []
    traits = ['O']*12 + ['C']*12 + ['E']*12 + ['A']*12 + ['S']*12
    for trait in traits:
        answers.append({'trait': trait, 'is_inverted': False, 'score': pattern[trait]})
    return answers

# 50 специально подобранных профилей: экстремумы, границы, редкие комбинации
PROFILES = [
    # === ЭКСТРЕМУМЫ (1-10) ===
    {"name": "Все 5 (максимум)", "pattern": {'O': 5, 'C': 5, 'E': 5, 'A': 5, 'S': 5}},
    {"name": "Все 1 (минимум)", "pattern": {'O': 1, 'C': 1, 'E': 1, 'A': 1, 'S': 1}},
    {"name": "Все 3 (середина)", "pattern": {'O': 3, 'C': 3, 'E': 3, 'A': 3, 'S': 3}},
    {"name": "Только O=5", "pattern": {'O': 5, 'C': 1, 'E': 1, 'A': 1, 'S': 1}},
    {"name": "Только C=5", "pattern": {'O': 1, 'C': 5, 'E': 1, 'A': 1, 'S': 1}},
    {"name": "Только E=5", "pattern": {'O': 1, 'C': 1, 'E': 5, 'A': 1, 'S': 1}},
    {"name": "Только A=5", "pattern": {'O': 1, 'C': 1, 'E': 1, 'A': 5, 'S': 1}},
    {"name": "Только S=5", "pattern": {'O': 1, 'C': 1, 'E': 1, 'A': 1, 'S': 5}},
    {"name": "Все 1 кроме O=5", "pattern": {'O': 5, 'C': 1, 'E': 1, 'A': 1, 'S': 1}},
    {"name": "Все 1 кроме C=5", "pattern": {'O': 1, 'C': 5, 'E': 1, 'A': 1, 'S': 1}},
    
    # === ДВЕ СИЛЬНЫЕ ЧЕРТЫ (11-20) ===
    {"name": "O+C=5, остальное 1", "pattern": {'O': 5, 'C': 5, 'E': 1, 'A': 1, 'S': 1}},
    {"name": "O+E=5, остальное 1", "pattern": {'O': 5, 'C': 1, 'E': 5, 'A': 1, 'S': 1}},
    {"name": "C+E=5, остальное 1", "pattern": {'O': 1, 'C': 5, 'E': 5, 'A': 1, 'S': 1}},
    {"name": "A+S=5, остальное 1", "pattern": {'O': 1, 'C': 1, 'E': 1, 'A': 5, 'S': 5}},
    {"name": "O+A=5, остальное 1", "pattern": {'O': 5, 'C': 1, 'E': 1, 'A': 5, 'S': 1}},
    {"name": "C+S=5, остальное 1", "pattern": {'O': 1, 'C': 5, 'E': 1, 'A': 1, 'S': 5}},
    {"name": "E+S=5, остальное 1", "pattern": {'O': 1, 'C': 1, 'E': 5, 'A': 1, 'S': 5}},
    {"name": "O+S=5, остальное 1", "pattern": {'O': 5, 'C': 1, 'E': 1, 'A': 1, 'S': 5}},
    {"name": "C+A=5, остальное 1", "pattern": {'O': 1, 'C': 5, 'E': 1, 'A': 5, 'S': 1}},
    {"name": "E+A=5, остальное 1", "pattern": {'O': 1, 'C': 1, 'E': 5, 'A': 5, 'S': 1}},
    
    # === ТРИ СИЛЬНЫЕ ЧЕРТЫ (21-25) ===
    {"name": "O+C+E=5, A=S=1", "pattern": {'O': 5, 'C': 5, 'E': 5, 'A': 1, 'S': 1}},
    {"name": "C+E+A=5, O=S=1", "pattern": {'O': 1, 'C': 5, 'E': 5, 'A': 5, 'S': 1}},
    {"name": "O+A+S=5, C=E=1", "pattern": {'O': 5, 'C': 1, 'E': 1, 'A': 5, 'S': 5}},
    {"name": "Все 5 кроме O=1", "pattern": {'O': 1, 'C': 5, 'E': 5, 'A': 5, 'S': 5}},
    {"name": "Все 5 кроме C=1", "pattern": {'O': 5, 'C': 1, 'E': 5, 'A': 5, 'S': 5}},
    
    # === ГРАНИЧНЫЕ СЛУЧАИ (26-35) ===
    {"name": "O=2,C=2,E=2,A=2,S=2 (все 2)", "pattern": {'O': 2, 'C': 2, 'E': 2, 'A': 2, 'S': 2}},
    {"name": "O=4,C=4,E=4,A=4,S=4 (все 4)", "pattern": {'O': 4, 'C': 4, 'E': 4, 'A': 4, 'S': 4}},
    {"name": "O=1,C=3,E=5,A=3,S=1 (горка)", "pattern": {'O': 1, 'C': 3, 'E': 5, 'A': 3, 'S': 1}},
    {"name": "O=5,C=3,E=1,A=3,S=5 (долина)", "pattern": {'O': 5, 'C': 3, 'E': 1, 'A': 3, 'S': 5}},
    {"name": "O=1,C=5,E=1,A=5,S=1 (чередование)", "pattern": {'O': 1, 'C': 5, 'E': 1, 'A': 5, 'S': 1}},
    {"name": "O=5,C=1,E=5,A=1,S=5 (чередование 2)", "pattern": {'O': 5, 'C': 1, 'E': 5, 'A': 1, 'S': 5}},
    {"name": "O=2,C=4,E=2,A=4,S=2 (половина)", "pattern": {'O': 2, 'C': 4, 'E': 2, 'A': 4, 'S': 2}},
    {"name": "O=4,C=2,E=4,A=2,S=4 (половина 2)", "pattern": {'O': 4, 'C': 2, 'E': 4, 'A': 2, 'S': 4}},
    {"name": "O=1,C=1,E=3,A=5,S=5 (S+A доминируют)", "pattern": {'O': 1, 'C': 1, 'E': 3, 'A': 5, 'S': 5}},
    {"name": "O=5,C=5,E=3,A=1,S=1 (O+C доминируют)", "pattern": {'O': 5, 'C': 5, 'E': 3, 'A': 1, 'S': 1}},
    
    # === РЕАЛИСТИЧНЫЕ ПРОФИЛИ (36-45) ===
    {"name": "IT-шник: O=4,C=4,E=2,A=2,S=3", "pattern": {'O': 4, 'C': 4, 'E': 2, 'A': 2, 'S': 3}},
    {"name": "Менеджер: O=3,C=4,E=5,A=3,S=4", "pattern": {'O': 3, 'C': 4, 'E': 5, 'A': 3, 'S': 4}},
    {"name": "Врач: O=4,C=5,E=3,A=5,S=5", "pattern": {'O': 4, 'C': 5, 'E': 3, 'A': 5, 'S': 5}},
    {"name": "Психолог: O=5,C=3,E=4,A=5,S=5", "pattern": {'O': 5, 'C': 3, 'E': 4, 'A': 5, 'S': 5}},
    {"name": "Бухгалтер: O=2,C=5,E=2,A=3,S=3", "pattern": {'O': 2, 'C': 5, 'E': 2, 'A': 3, 'S': 3}},
    {"name": "Предприниматель: O=4,C=3,E=5,A=2,S=3", "pattern": {'O': 4, 'C': 3, 'E': 5, 'A': 2, 'S': 3}},
    {"name": "Дизайнер: O=5,C=2,E=3,A=3,S=2", "pattern": {'O': 5, 'C': 2, 'E': 3, 'A': 3, 'S': 2}},
    {"name": "Слесарь: O=2,C=4,E=2,A=2,S=2", "pattern": {'O': 2, 'C': 4, 'E': 2, 'A': 2, 'S': 2}},
    {"name": "Учитель: O=3,C=4,E=4,A=5,S=5", "pattern": {'O': 3, 'C': 4, 'E': 4, 'A': 5, 'S': 5}},
    {"name": "Повар: O=3,C=4,E=3,A=3,S=3", "pattern": {'O': 3, 'C': 4, 'E': 3, 'A': 3, 'S': 3}},
    
    # === РЕДКИЕ/СТРАННЫЕ КОМБИНАЦИИ (46-50) ===
    {"name": "O=5,C=1,E=5,A=1,S=5 (три пика)", "pattern": {'O': 5, 'C': 1, 'E': 5, 'A': 1, 'S': 5}},
    {"name": "O=1,C=5,E=1,A=5,S=1 (два пика)", "pattern": {'O': 1, 'C': 5, 'E': 1, 'A': 5, 'S': 1}},
    {"name": "O=3,C=1,E=5,A=1,S=3 (E-всплеск)", "pattern": {'O': 3, 'C': 1, 'E': 5, 'A': 1, 'S': 3}},
    {"name": "O=1,C=3,E=1,A=5,S=3 (A-всплеск)", "pattern": {'O': 1, 'C': 3, 'E': 1, 'A': 5, 'S': 3}},
    {"name": "O=2,C=2,E=5,A=2,S=2 (только E)", "pattern": {'O': 2, 'C': 2, 'E': 5, 'A': 2, 'S': 2}},
]

async def run_tests():
    professions = await get_professions()
    
    issues = []
    stats = {'R': 0, 'I': 0, 'A': 0, 'S': 0, 'E': 0, 'C': 0}
    match_stats = []
    
    for i, prof in enumerate(PROFILES, 1):
        answers = make_answers(prof["pattern"])
        raw, norm = calculate_scores(answers)
        riasec = calculate_riasec(norm)
        top = match_professions(norm, riasec, professions)
        
        dom = max(riasec, key=riasec.get)
        stats[dom] += 1
        
        top_match = top[0]['match']
        top_riasec = top[0]['riasec']
        match_stats.append(top_match)
        
        # Проверки
        if top_match < 30:
            issues.append(f"#{i:02d} НИЗКИЙ match: {top[0]['title']} = {top_match}% | {prof['name']}")
        
        if top_riasec != dom and top_match > 50:
            issues.append(f"#{i:02d} НЕСОВПАДЕНИЕ: доминанта={dom}, топ={top_riasec} ({top[0]['title']} {top_match}%) | {prof['name']}")
        
        # Выводим все
        print(f"\n{'='*70}")
        print(f"#{i:02d} {prof['name']}")
        print(f"{'='*70}")
        print(f"Big Five: O={norm['O']:3d} C={norm['C']:3d} E={norm['E']:3d} A={norm['A']:3d} S={norm['S']:3d}")
        print(f"RIASEC: R={riasec['R']:2d} I={riasec['I']:2d} A={riasec['A']:2d} S={riasec['S']:2d} E={riasec['E']:2d} C={riasec['C']:2d} | Доминанта: {dom}")
        print(f"{'─'*70}")
        for j, p in enumerate(top, 1):
            marker = ">>" if j == 1 else "  "
            print(f"{marker}{j}. {p['title']:<40} {p['match']:3d}% (RIASEC: {p['riasec']})")
        print(f"{'='*70}")
    
    print(f"\n{'='*70}")
    print("СТАТИСТИКА 50 ТЕСТОВ (экстремумы + границы + реалистичные)")
    print(f"{'='*70}")
    print(f"Распределение доминант RIASEC:")
    for k, v in stats.items():
        print(f"  {k}: {v} ({v/50*100:.0f}%)")
    
    print(f"\nСтатистика match топ-1:")
    print(f"  Средний: {sum(match_stats)/len(match_stats):.1f}%")
    print(f"  Мин: {min(match_stats)}%")
    print(f"  Макс: {max(match_stats)}%")
    print(f"  <30%: {sum(1 for m in match_stats if m < 30)}")
    print(f"  <50%: {sum(1 for m in match_stats if m < 50)}")
    print(f"  >80%: {sum(1 for m in match_stats if m > 80)}")
    print(f"  =100%: {sum(1 for m in match_stats if m == 100)}")
    
    print(f"\n{'='*70}")
    print(f"ПРОБЛЕМЫ ({len(issues)}):")
    print(f"{'='*70}")
    if issues:
        for issue in issues:
            print(f"  ⚠️ {issue}")
    else:
        print("  ✅ Проблем не найдено!")
    print(f"{'='*70}")

asyncio.run(run_tests())
