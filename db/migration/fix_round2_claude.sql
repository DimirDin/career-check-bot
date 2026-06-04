-- ============================================
-- FIX ROUND 2 — после ревью Claude
-- ============================================

-- 0. БЭКАП (выполни отдельно!)
-- docker exec career_db pg_dump -U career_user -d career_db > backup_round2_$(date +%Y%m%d_%H%M%S).sql

-- ============================================
-- 1. ТЕРМИНОЛОГИЧЕСКИЕ КАТАСТРОФЫ
-- ============================================

-- 1.1 "current kills" → электрический ток (ID 34)
-- Ошибка: "current" переведено как "текущий/актуальный", а не "электрический ток"
UPDATE profession_details 
SET cons_es = replace(cons_es::text, 'Peligro: muertes actuales', 'Peligro: la corriente eléctrica mata')::jsonb
WHERE profession_id = 34;

UPDATE profession_details 
SET cons_pt = replace(cons_pt::text, 'Perigo - mortes atuais', 'Perigo - a corrente elétrica mata')::jsonb
WHERE profession_id = 34;

UPDATE profession_details 
SET cons_en = replace(cons_en::text, 'Danger - current kills', 'Danger - electric shock kills')::jsonb
WHERE profession_id = 34;

-- Проверим reality-поля тоже
UPDATE profession_details 
SET reality_es = replace(reality_es, 'muertes actuales', 'la corriente mata')
WHERE profession_id = 34 AND reality_es LIKE '%muertes actuales%';

UPDATE profession_details 
SET reality_pt = replace(reality_pt, 'mortes atuais', 'a corrente mata')
WHERE profession_id = 34 AND reality_pt LIKE '%mortes atuais%';

-- 1.2 "село идеально" → посадка/крой (ID 39 — Швея)
-- Ошибка: "село" в швейном деле = посадка/fit, а не деревня/village
UPDATE profession_details 
SET reality_en = replace(reality_en, '"the village is perfect"', '"the fit is perfect"')
WHERE profession_id = 39;

UPDATE profession_details 
SET reality_es = replace(reality_es, '"el pueblo está perfecto"', '"el ajuste es perfecto"')
WHERE profession_id = 39;

UPDATE profession_details 
SET reality_pt = replace(reality_pt, '"a aldeia é perfeita"', '"o caimento é perfeito"')
WHERE profession_id = 39;

UPDATE profession_details 
SET reality_hi = replace(reality_hi, '"गांव एकदम सही है"', '"सिलाई बिल्कुल सही है"')
WHERE profession_id = 39;

-- 1.3 "Пожарный Сэм" → нейтральный перевод (ID 49)
-- Ошибка: культурная отсылка к советскому мультфильму непонятна за рубежом
UPDATE profession_details 
SET reality_en = replace(reality_en, 'Not Fireman Sam', 'Not a cartoon firefighter')
WHERE profession_id = 49;

UPDATE profession_details 
SET reality_es = replace(reality_es, 'No el bombero Sam', 'No es un bombero de dibujos animados')
WHERE profession_id = 49;

UPDATE profession_details 
SET reality_pt = replace(reality_pt, 'Não o bombeiro Sam', 'Não é um bombeiro de desenho animado')
WHERE profession_id = 49;

UPDATE profession_details 
SET reality_hi = replace(reality_hi, 'फायरमैन सैम नहीं', 'कार्टून फायरफाइटर नहीं')
WHERE profession_id = 49;

-- Исправляем cons_es "disparo, listo" если осталось
UPDATE profession_details 
SET cons_es = replace(cons_es::text, 'disparo, listo', 'fuego, adelante')::jsonb
WHERE profession_id = 49 AND cons_es::text LIKE '%disparo%';

-- ============================================
-- 2. ПРОВЕРКА ВСЕХ reality-полей на похожие ошибки
-- ============================================

-- 2.1 "фаза нулевая" у электрика (ID 34) — проверим переводы
UPDATE profession_details 
SET reality_en = replace(reality_en, '"phase zero, but I''m alive"', '"zero phase, but I''m alive"')
WHERE profession_id = 34 AND reality_en LIKE '%phase zero%';

-- 2.2 "Топ Ган" (ID 46) — культурная отсылка к фильму
UPDATE profession_details 
SET reality_en = replace(reality_en, 'Not Top Gun', 'Not a movie pilot')
WHERE profession_id = 46;

UPDATE profession_details 
SET reality_es = replace(reality_es, 'No Top Gun', 'No es un piloto de película')
WHERE profession_id = 46;

UPDATE profession_details 
SET reality_pt = replace(reality_pt, 'Não Top Gun', 'Não é um piloto de cinema')
WHERE profession_id = 46;

-- 2.3 "GTA driver" (ID 52) — культурная отсылка к игре
UPDATE profession_details 
SET reality_en = replace(reality_en, 'Not a "GTA driver"', 'Not a video game trucker')
WHERE profession_id = 52;

UPDATE profession_details 
SET reality_es = replace(reality_es, 'No es un "conductor de GTA"', 'No es un camionista de videojuegos')
WHERE profession_id = 52;

UPDATE profession_details 
SET reality_pt = replace(reality_pt, 'Não é um "motorista GTA"', 'Não é um caminhoneiro de videogame')
WHERE profession_id = 52;

-- 2.4 "пиратские приключения" (ID 47) — проверим
UPDATE profession_details 
SET reality_en = replace(reality_en, 'Not "pirate adventures"', 'Not a pirate adventure')
WHERE profession_id = 47;

-- 2.5 "Микеланджело" (ID 83) — культурная отсылка
UPDATE profession_details 
SET reality_en = replace(reality_en, 'Not Michelangelo', 'Not a Renaissance master')
WHERE profession_id = 83;

UPDATE profession_details 
SET reality_es = replace(reality_es, 'No Miguel Ángel', 'No es un maestro del Renacimiento')
WHERE profession_id = 83;

UPDATE profession_details 
SET reality_pt = replace(reality_pt, 'Não Michelangelo', 'Não é um mestre do Renascimento')
WHERE profession_id = 83;

-- 2.6 "Netflix boss" (ID 94) — культурная отсылка
UPDATE profession_details 
SET reality_en = replace(reality_en, 'Not the Netflix boss', 'Not a TV chef celebrity')
WHERE profession_id = 94;

UPDATE profession_details 
SET reality_es = replace(reality_es, 'No el jefe de Netflix', 'No es un chef de televisión famoso')
WHERE profession_id = 94;

UPDATE profession_details 
SET reality_pt = replace(reality_pt, 'Não é o chefe da Netflix', 'Não é um chef de TV famoso')
WHERE profession_id = 94;

-- 2.7 "Instagram star" (ID 105) — культурная отсылка
UPDATE profession_details 
SET reality_en = replace(reality_en, 'Not an "Instagram star"', 'Not a social media influencer')
WHERE profession_id = 105;

UPDATE profession_details 
SET reality_es = replace(reality_es, 'No es una "estrella de Instagram"', 'No es un influencer de redes sociales')
WHERE profession_id = 105;

UPDATE profession_details 
SET reality_pt = replace(reality_pt, 'Não é uma "estrela do Instagram"', 'Não é um influencer de redes sociais')
WHERE profession_id = 105;

-- 2.8 "Google Mapper" (ID 51) — культурная отсылка
UPDATE profession_details 
SET reality_en = replace(reality_en, 'Not "Google Mapper"', 'Not a Google Maps surveyor')
WHERE profession_id = 51;

UPDATE profession_details 
SET reality_es = replace(reality_es, 'No "Google Mapper"', 'No es un topógrafo de Google Maps')
WHERE profession_id = 51;

UPDATE profession_details 
SET reality_pt = replace(reality_pt, 'Não é "Google Mapper"', 'Não é um topógrafo do Google Maps')
WHERE profession_id = 51;

-- ============================================
-- 3. ИСПРАВЛЕНИЕ ДОСЛОВНЫХ КАЛЬК В cons
-- ============================================

-- 3.1 "фаза нулевая" → "zero phase" (EN, ID 34)
UPDATE profession_details 
SET cons_en = replace(cons_en::text, '"phase zero"', '"zero phase"')::jsonb
WHERE profession_id = 34;

-- 3.2 "вечное обучение" → нативные термины (все ID)
UPDATE profession_details 
SET cons_en = replace(cons_en::text, '"Eternal learning"', '"Never-ending learning"')::jsonb
WHERE cons_en::text LIKE '%"Eternal learning"%';

-- 3.3 "render fell" → "render crashed" (EN, ID 90)
UPDATE profession_details 
SET cons_en = replace(cons_en::text, '"render fell"', '"render crashed"')::jsonb
WHERE profession_id = 90;

-- 3.4 "render ready" → "render is ready" (EN, ID 88)
UPDATE profession_details 
SET cons_en = replace(cons_en::text, '"render ready!"', '"render is ready!"')::jsonb
WHERE profession_id = 88;

-- 3.5 "the boss changed his mind - again" → "the boss changed his mind again" (EN, ID 149)
UPDATE profession_details 
SET cons_en = replace(cons_en::text, '"The boss changed his mind - again"', '"The boss changed his mind again"')::jsonb
WHERE profession_id = 149;

-- ============================================
-- 4. ПРОВЕРКА И ИСПРАВЛЕНИЕ HI-специфичных ошибок
-- ============================================

-- 4.1 "बर्नआउट" — проверим, остались ли ещё
UPDATE profession_details 
SET cons_hi = replace(cons_hi::text, 'बर्नआउट', 'पेशेवर थकान')::jsonb
WHERE cons_hi::text LIKE '%बर्नआउट%';

-- 4.2 "शाश्वत शिक्षा" — проверим, остались ли ещё
UPDATE profession_details 
SET cons_hi = replace(cons_hi::text, 'शाश्वत शिक्षा', 'निरंतर सीखना')::jsonb
WHERE cons_hi::text LIKE '%शाश्वत शिक्षा%';

-- 4.3 "एक्सेल" вместо "Excel" — проверим
UPDATE profession_details 
SET cons_hi = replace(cons_hi::text, 'एक्सेल', 'Excel')::jsonb
WHERE cons_hi::text LIKE '%एक्सेल%';

-- ============================================
-- 5. ЛОГИРОВАНИЕ
-- ============================================

INSERT INTO translation_fix_log (table_name, field_name, language, fix_type, fixed_by)
VALUES 
('profession_details', 'reality_es', 'es', 'critical', 'claude_review_round2'),
('profession_details', 'reality_pt', 'pt', 'critical', 'claude_review_round2'),
('profession_details', 'reality_en', 'en', 'critical', 'claude_review_round2'),
('profession_details', 'reality_hi', 'hi', 'critical', 'claude_review_round2'),
('profession_details', 'cons_es', 'es', 'critical', 'claude_review_round2'),
('profession_details', 'cons_pt', 'pt', 'critical', 'claude_review_round2'),
('profession_details', 'cons_en', 'en', 'major', 'claude_review_round2');

-- ============================================
-- 6. ФИНАЛЬНАЯ ПРОВЕРКА
-- ============================================

SELECT 'ROUND 2 CHECKS' as batch,
       'crujido remaining' as check_name, 
       COUNT(*) as remaining
FROM profession_details WHERE cons_es::text ~* 'crujido'
UNION ALL
SELECT 'ROUND 2 CHECKS', 'muertes actuales remaining', COUNT(*)
FROM profession_details WHERE cons_es::text LIKE '%muertes actuales%'
UNION ALL
SELECT 'ROUND 2 CHECKS', 'village/fit remaining', COUNT(*)
FROM profession_details WHERE reality_en LIKE '%village is perfect%'
UNION ALL
SELECT 'ROUND 2 CHECKS', 'Fireman Sam remaining', COUNT(*)
FROM profession_details WHERE reality_en LIKE '%Fireman Sam%'
UNION ALL
SELECT 'ROUND 2 CHECKS', 'Top Gun remaining', COUNT(*)
FROM profession_details WHERE reality_en LIKE '%Top Gun%'
UNION ALL
SELECT 'ROUND 2 CHECKS', 'GTA driver remaining', COUNT(*)
FROM profession_details WHERE reality_en LIKE '%GTA driver%'
UNION ALL
SELECT 'ROUND 2 CHECKS', 'Michelangelo remaining', COUNT(*)
FROM profession_details WHERE reality_en LIKE '%Michelangelo%'
UNION ALL
SELECT 'ROUND 2 CHECKS', 'Netflix boss remaining', COUNT(*)
FROM profession_details WHERE reality_en LIKE '%Netflix boss%'
UNION ALL
SELECT 'ROUND 2 CHECKS', 'Instagram star remaining', COUNT(*)
FROM profession_details WHERE reality_en LIKE '%Instagram star%'
UNION ALL
SELECT 'ROUND 2 CHECKS', 'Google Mapper remaining', COUNT(*)
FROM profession_details WHERE reality_en LIKE '%Google Mapper%';