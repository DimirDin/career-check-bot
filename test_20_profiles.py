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
    """Генерирует 60 ответов по паттерну {O,C,E,A,S: score}"""
    answers = []
    traits = ['O']*12 + ['C']*12 + ['E']*12 + ['A']*12 + ['S']*12
    for trait in traits:
        answers.append({'trait': trait, 'is_inverted': False, 'score': pattern[trait]})
    return answers

PROFILES = [
    # 1-5: Экстремальные
    {"name": "Все 5 (максимум)", "pattern": {'O': 5, 'C': 5, 'E': 5, 'A': 5, 'S': 5}},
    {"name": "Все 1 (минимум)", "pattern": {'O': 1, 'C': 1, 'E': 1, 'A': 1, 'S': 1}},
    {"name": "Все 3 (середина)", "pattern": {'O': 3, 'C': 3, 'E': 3, 'A': 3, 'S': 3}},
    {"name": "Только C=5", "pattern": {'O': 1, 'C': 5, 'E': 1, 'A': 1, 'S': 1}},
    {"name": "Только E=5", "pattern": {'O': 1, 'C': 1, 'E': 5, 'A': 1, 'S': 1}},
    
    # 6-10: Реалистичные IT/аналитик
    {"name": "Программист: O=4,C=4,E=2,A=2,S=3", "pattern": {'O': 4, 'C': 4, 'E': 2, 'A': 2, 'S': 3}},
    {"name": "Data Scientist: O=5,C=4,E=2,A=2,S=3", "pattern": {'O': 5, 'C': 4, 'E': 2, 'A': 2, 'S': 3}},
    {"name": "DevOps: O=3,C=5,E=3,A=2,S=4", "pattern": {'O': 3, 'C': 5, 'E': 3, 'A': 2, 'S': 4}},
    {"name": "Дизайнер: O=5,C=2,E=3,A=3,S=2", "pattern": {'O': 5, 'C': 2, 'E': 3, 'A': 3, 'S': 2}},
    {"name": "Менеджер IT: O=3,C=4,E=4,A=3,S=4", "pattern": {'O': 3, 'C': 4, 'E': 4, 'A': 3, 'S': 4}},
    
    # 11-15: Медицина/психология/образование
    {"name": "Врач: O=4,C=5,E=3,A=5,S=5", "pattern": {'O': 4, 'C': 5, 'E': 3, 'A': 5, 'S': 5}},
    {"name": "Психолог: O=5,C=3,E=4,A=5,S=5", "pattern": {'O': 5, 'C': 3, 'E': 4, 'A': 5, 'S': 5}},
    {"name": "Учитель: O=3,C=4,E=4,A=5,S=5", "pattern": {'O': 3, 'C': 4, 'E': 4, 'A': 5, 'S': 5}},
    {"name": "Медсестра: O=3,C=5,E=3,A=5,S=5", "pattern": {'O': 3, 'C': 5, 'E': 3, 'A': 5, 'S': 5}},
    {"name": "Фармацевт: O=4,C=5,E=2,A=3,S=3", "pattern": {'O': 4, 'C': 5, 'E': 2, 'A': 3, 'S': 3}},
    
    # 16-20: Бизнес/творчество/ручной труд
    {"name": "Предприниматель: O=4,C=3,E=5,A=2,S=3", "pattern": {'O': 4, 'C': 3, 'E': 5, 'A': 2, 'S': 3}},
    {"name": "Бухгалтер: O=2,C=5,E=2,A=3,S=3", "pattern": {'O': 2, 'C': 5, 'E': 2, 'A': 3, 'S': 3}},
    {"name": "Маркетолог: O=5,C=3,E=5,A=3,S=3", "pattern": {'O': 5, 'C': 3, 'E': 5, 'A': 3, 'S': 3}},
    {"name": "Слесарь: O=2,C=4,E=2,A=2,S=2", "pattern": {'O': 2, 'C': 4, 'E': 2, 'A': 2, 'S': 2}},
    {"name": "Художник: O=5,C=1,E=2,A=3,S=1", "pattern": {'O': 5, 'C': 1, 'E': 2, 'A': 3, 'S': 1}},
]

async def run_tests():
    professions = await get_professions()
    
    for i, prof in enumerate(PROFILES, 1):
        answers = make_answers(prof["pattern"])
        raw, norm = calculate_scores(answers)
        riasec = calculate_riasec(norm)
        top = match_professions(norm, riasec, professions)
        
        print(f"\n{'='*70}")
        print(f"#{i:02d} {prof['name']}")
        print(f"{'='*70}")
        print(f"Big Five: O={norm['O']:3d} C={norm['C']:3d} E={norm['E']:3d} A={norm['A']:3d} S={norm['S']:3d}")
        print(f"RIASEC: R={riasec['R']:2d} I={riasec['I']:2d} A={riasec['A']:2d} S={riasec['S']:2d} E={riasec['E']:2d} C={riasec['C']:2d} | Доминанта: {max(riasec, key=riasec.get)}")
        print(f"{'-'*70}")
        for j, p in enumerate(top, 1):
            marker = ">>" if j == 1 else "  "
            print(f"{marker}{j}. {p['title']:<35} {p['match']:3d}% (RIASEC: {p['riasec']})")
        print(f"{'='*70}")

asyncio.run(run_tests())
