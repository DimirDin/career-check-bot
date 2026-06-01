import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.calculator import calculate_scores, calculate_riasec, match_professions
import asyncio
import asyncpg
import json
import random
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

def generate_random_profile():
    """Генерирует реалистичный профиль Big Five (1-5)"""
    # Нормальное распределение вокруг 3, с редкими экстремумами
    def rand_score():
        r = random.gauss(3.0, 0.8)
        return max(1, min(5, round(r)))
    
    return {
        'O': rand_score(),
        'C': rand_score(),
        'E': rand_score(),
        'A': rand_score(),
        'S': rand_score()
    }

async def run_tests():
    professions = await get_professions()
    
    issues = []
    stats = {'R': 0, 'I': 0, 'A': 0, 'S': 0, 'E': 0, 'C': 0}
    match_stats = []
    
    for i in range(1, 51):
        pattern = generate_random_profile()
        answers = make_answers(pattern)
        raw, norm = calculate_scores(answers)
        riasec = calculate_riasec(norm)
        top = match_professions(norm, riasec, professions)
        
        dom = max(riasec, key=riasec.get)
        stats[dom] += 1
        
        # Проверяем на проблемы
        top_match = top[0]['match']
        top_riasec = top[0]['riasec']
        
        # Проблема 1: топ-профессия с match < 30% (слишком низко)
        if top_match < 30:
            issues.append(f"#{i:02d} НИЗКИЙ match: {top[0]['title']} = {top_match}%")
        
        # Проблема 2: топ-профессия RIASEC не совпадает с доминантой пользователя
        if top_riasec != dom and top_match > 50:
            issues.append(f"#{i:02d} НЕСОВПАДЕНИЕ RIASEC: доминанта={dom}, топ={top_riasec} ({top[0]['title']} {top_match}%)")
        
        # Проблема 3: все топ-5 из одного RIASEC (слишком узко)
        riasec_top5 = set(p['riasec'] for p in top)
        if len(riasec_top5) == 1:
            issues.append(f"#{i:02d} МОНО-RIASEC: все топ-5 = {list(riasec_top5)[0]}")
        
        match_stats.append(top_match)
        
        # Выводим каждый 10-й для наглядности
        if i % 10 == 1:
            print(f"\n{'='*70}")
            print(f"#{i:02d} Случайный профиль: O={pattern['O']} C={pattern['C']} E={pattern['E']} A={pattern['A']} S={pattern['S']}")
            print(f"Big Five: O={norm['O']:3d} C={norm['C']:3d} E={norm['E']:3d} A={norm['A']:3d} S={norm['S']:3d}")
            print(f"RIASEC: R={riasec['R']:2d} I={riasec['I']:2d} A={riasec['A']:2d} S={riasec['S']:2d} E={riasec['E']:2d} C={riasec['C']:2d} | Доминанта: {dom}")
            print(f"{'─'*70}")
            for j, p in enumerate(top, 1):
                marker = ">>" if j == 1 else "  "
                print(f"{marker}{j}. {p['title']:<40} {p['match']:3d}% (RIASEC: {p['riasec']})")
            print(f"{'='*70}")
    
    print(f"\n{'='*70}")
    print("СТАТИСТИКА 50 ТЕСТОВ")
    print(f"{'='*70}")
    print(f"Распределение доминант RIASEC:")
    for k, v in stats.items():
        print(f"  {k}: {v} ({v/50*100:.0f}%)")
    
    print(f"\nСтатистика match топ-1:")
    print(f"  Средний: {sum(match_stats)/len(match_stats):.1f}%")
    print(f"  Мин: {min(match_stats)}%")
    print(f"  Макс: {max(match_stats)}%")
    print(f"  <30%: {sum(1 for m in match_stats if m < 30)} случаев")
    print(f"  <50%: {sum(1 for m in match_stats if m < 50)} случаев")
    print(f"  >80%: {sum(1 for m in match_stats if m > 80)} случаев")
    
    print(f"\n{'='*70}")
    print(f"ПРОБЛЕМЫ ({len(issues)}):")
    print(f"{'='*70}")
    if issues:
        for issue in issues[:20]:  # Первые 20
            print(f"  ⚠️ {issue}")
        if len(issues) > 20:
            print(f"  ... и ещё {len(issues)-20}")
    else:
        print("  ✅ Проблем не найдено!")
    print(f"{'='*70}")

asyncio.run(run_tests())
