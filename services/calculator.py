import json
import numpy as np

def calculate_scores(answers: list) -> tuple:
    traits = {'O': [], 'C': [], 'E': [], 'A': [], 'S': []}
    
    for ans in answers:
        trait = ans['trait']
        score = ans['score']
        
        if ans['is_inverted']:
            score = 6 - score
        
        traits[trait].append(score)
    
    raw = {trait: sum(scores) for trait, scores in traits.items()}
    normalized = {trait: round((score - 12) / 48 * 100) for trait, score in raw.items()}
    
    return raw, normalized

def calculate_riasec(normalized: dict) -> dict:
    O, C, E, A, S = normalized['O'], normalized['C'], normalized['E'], normalized['A'], normalized['S']
    
    riasec = {
        'R': round((C * 0.6 + S * 0.4) * max(0, (100 - O) / 100) * 0.8),
        'I': round((O * 0.5 + C * 0.3 + S * 0.2) * 0.9),
        'A': round((O * 0.7 + A * 0.3) * max(0, (100 - C) / 100) * 0.8),
        'S': round((E * 0.5 + A * 0.5) * 0.9),
        'E': round((E * 0.6 + (100-A) * 0.2 + S * 0.2) * 0.9),
        'C': round((C * 0.7 + A * 0.3) * 0.9)
    }
    
    return riasec

def match_professions(normalized: dict, riasec: dict, professions: list) -> list:
    """
    Усиленное поэлементное сравнение с жёсткими штрафами за несоответствие RIASEC.
    """
    user_riasec_max = max(riasec, key=riasec.get)
    user_riasec_val = riasec[user_riasec_max]
    user_vector = np.array([normalized['O'], normalized['C'], normalized['E'], normalized['A'], normalized['S']])
    
    matches = []
    for prof in professions:
        req = prof['required_traits']
        if isinstance(req, str):
            req = json.loads(req)
        
        prof_vector = np.array([req['O'], req['C'], req['E'], req['A'], req['S']])
        
        # 1. Поэлементное отклонение
        diffs = np.abs(user_vector - prof_vector)
        relative_diffs = diffs / np.maximum(prof_vector, 15)
        element_match = np.maximum(0, 100 - relative_diffs * 100)
        base_score = np.mean(element_match)
        
        # 2. Жёсткий штраф за несоответствие RIASEC-доминанте
        # Если профессия типа R, а у пользователя R низкий → штраф
        prof_riasec = prof['riasec_type']
        user_riasec_for_prof = riasec[prof_riasec]
        
        # Если профессия требует высокого RIASEC, а у пользователя низкий
        riasec_penalty = 0
        if prof_riasec in ['I', 'E', 'S'] and user_riasec_for_prof < 30:
            riasec_penalty = 20
        elif prof_riasec in ['R', 'C'] and user_riasec_for_prof < 20:
            riasec_penalty = 20
        elif prof_riasec == 'A' and user_riasec_for_prof < 25:
            riasec_penalty = 15
        
        # 3. Критические провалы по ключевым чертам
        critical_penalty = 0
        for i, trait in enumerate(['O', 'C', 'E', 'A', 'S']):
            if prof_vector[i] > 75 and user_vector[i] < 35:
                critical_penalty += 30
            elif prof_vector[i] > 65 and user_vector[i] < 25:
                critical_penalty += 20
        
        # 4. Бонус за совпадение доминанты
        riasec_bonus = 15 if prof_riasec == user_riasec_max else 0
        
        # 5. Итог
        final_score = max(0, min(100, round(base_score - riasec_penalty - critical_penalty + riasec_bonus)))
        
        matches.append({
            'title': prof['title'],
            'match': final_score,
            'description': prof['description'],
            'salary': '',  # salary_range удален
            'growth': prof['growth_potential'],
            'riasec': prof['riasec_type']
        })
    
    matches.sort(key=lambda x: x['match'], reverse=True)
    return matches[:5]
