-- ============================================
-- FIX ALL TRANSLATIONS - Single File
-- Career Guidance Bot Database
-- ============================================

-- 0. БЭКАП (выполни отдельно перед запуском!)
-- docker exec career_db pg_dump -U career_user -d career_db > backup_pre_fix_$(date +%Y%m%d_%H%M%S).sql

-- ============================================
-- 1. ИНФРАСТРУКТУРА
-- ============================================

CREATE TABLE IF NOT EXISTS translation_fix_log (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    language TEXT,
    fix_type TEXT CHECK (fix_type IN ('critical', 'major', 'minor', 'consistency')),
    fixed_at TIMESTAMP DEFAULT NOW(),
    fixed_by TEXT DEFAULT current_user
);

CREATE TABLE IF NOT EXISTS translation_glossary (
    id SERIAL PRIMARY KEY,
    concept_ru TEXT UNIQUE NOT NULL,
    concept_en TEXT,
    concept_hi TEXT,
    concept_es TEXT,
    concept_pt TEXT,
    context TEXT,
    approved_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO translation_glossary (concept_ru, concept_en, concept_hi, concept_es, concept_pt, context)
VALUES 
('выгорание', 'burnout', 'पेशेवर थकान', 'agotamiento profesional', 'esgotamento profissional', 'career'),
('кранч', 'crunch', 'अतिरिक्त ओवरटाइम', 'horas extras intensivas', 'horas extras intensivas', 'game_dev'),
('голос садится', 'voice gets strained', 'आवाज़ भर्रा जाना', 'la voz se apaga', 'a voz se apaga', 'health'),
('бумаги больше людей', 'more paperwork than people', 'कागजी काम लोगों से ज़्यादा', 'más papeleo que gente', 'mais papelada do que pessoas', 'workload'),
('вечное обучение', 'never-ending learning', 'निरंतर सीखना', 'aprendizaje continuo', 'aprendizagem contínua', 'career')
ON CONFLICT (concept_ru) DO NOTHING;

-- ============================================
-- 2. КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ
-- ============================================

-- 2.1 "crujido" → "horas extras intensivas" (ES) - ОШИБКА: "crujido" = скрип!
UPDATE profession_details 
SET cons_es = replace(cons_es::text, 'El crujido es la norma', 'Las horas extras intensivas son la norma')::jsonb
WHERE cons_es::text LIKE '%crujido%';

-- 2.2 "голос садится" - все языки
UPDATE profession_details 
SET cons_es = replace(cons_es::text, '"La voz se sienta"', '"la voz se apaga (se vuelve ronca)"')::jsonb
WHERE cons_es::text LIKE '%"La voz se sienta"%';

UPDATE profession_details 
SET cons_pt = replace(cons_pt::text, '"A voz se senta"', '"a voz se apaga (fica rouca)"')::jsonb
WHERE cons_pt::text LIKE '%"A voz se senta"%';

UPDATE profession_details 
SET cons_hi = replace(cons_hi::text, '"आवाज बैठ जाती है"', '"आवाज़ भर्रा जाती है"')::jsonb
WHERE cons_hi::text LIKE '%"आवाज बैठ जाती है"%';

-- 2.3 "бумаги больше людей" - все языки
UPDATE profession_details 
SET cons_es = replace(cons_es::text, 'Papeles más gente', 'más papeleo que gente')::jsonb
WHERE cons_es::text LIKE '%Papeles más gente%';

UPDATE profession_details 
SET cons_pt = replace(cons_pt::text, 'Papéis mais pessoas', 'mais papelada do que pessoas')::jsonb
WHERE cons_pt::text LIKE '%Papéis mais pessoas%';

UPDATE profession_details 
SET cons_hi = replace(cons_hi::text, 'कागजात अधिक लोग', 'कागजी काम लोगों से ज़्यादा')::jsonb
WHERE cons_hi::text LIKE '%कागजात अधिक लोग%';

-- 2.4 "бумаги больше анализа" - все языки
UPDATE profession_details 
SET cons_es = replace(cons_es::text, 'Artículos más análisis', 'más papeleo que análisis')::jsonb
WHERE cons_es::text LIKE '%Artículos más análisis%';

UPDATE profession_details 
SET cons_pt = replace(cons_pt::text, 'Artigos mais análises', 'mais papelada do que análise')::jsonb
WHERE cons_pt::text LIKE '%Artigos mais análises%';

UPDATE profession_details 
SET cons_hi = replace(cons_hi::text, 'कागजात अधिक विश्लेषण', 'कागजी काम विश्लेषण से ज़्यादा')::jsonb
WHERE cons_hi::text LIKE '%कागजात अधिक विश्लेषण%';

-- ============================================
-- 3. СЕРЬЁЗНЫЕ ИСПРАВЛЕНИЯ
-- ============================================

-- 3.1 Унификация "выгорание"
UPDATE profession_details 
SET cons_hi = replace(cons_hi::text, 'बर्नआउट', 'पेशेवर थकान')::jsonb
WHERE cons_hi::text LIKE '%बर्नआउट%';

UPDATE profession_details 
SET cons_es = replace(cons_es::text, 'Burnout', 'agotamiento')::jsonb
WHERE cons_es::text LIKE '%Burnout%';

UPDATE profession_details 
SET cons_pt = replace(cons_pt::text, 'Burnout', 'esgotamento')::jsonb
WHERE cons_pt::text LIKE '%Burnout%';

-- 3.2 "ответственность — жизни" (неправильный смысл!)
UPDATE profession_details 
SET cons_es = replace(cons_es::text, '"La responsabilidad es vida"', '"responsabilidad por vidas humanas"')::jsonb
WHERE cons_es::text LIKE '%"La responsabilidad es vida"%';

UPDATE profession_details 
SET cons_pt = replace(cons_pt::text, '"Responsabilidade é vida"', '"responsabilidade por vidas humanas"')::jsonb
WHERE cons_pt::text LIKE '%"Responsabilidade é vida"%';

UPDATE profession_details 
SET cons_hi = replace(cons_hi::text, '"जिम्मेदारी ही जीवन है"', '"जानों की जिम्मेदारी"')::jsonb
WHERE cons_hi::text LIKE '%"जिम्मेदारी ही जीवन है"%';

-- 3.3 "вечное обучение" в хинди
UPDATE profession_details 
SET cons_hi = replace(cons_hi::text, 'शाश्वत शिक्षा', 'निरंतर सीखना')::jsonb
WHERE cons_hi::text LIKE '%शाश्वत शिक्षा%';

-- 3.4 "зрение падает"
UPDATE profession_details 
SET cons_es = replace(cons_es::text, '"La visión está cayendo"', '"la vista se deteriora"')::jsonb
WHERE cons_es::text LIKE '%"La visión está cayendo"%';

UPDATE profession_details 
SET cons_pt = replace(cons_pt::text, '"A visão está caindo"', '"a visão se deteriora"')::jsonb
WHERE cons_pt::text LIKE '%"A visão está caindo"%';

UPDATE profession_details 
SET cons_hi = replace(cons_hi::text, '"दृष्टि गिर रही है"', '"दृष्टि कमजोर होती है"')::jsonb
WHERE cons_hi::text LIKE '%"दृष्टि गिर रही है"%';

-- 3.5 "иерархия давит"
UPDATE profession_details 
SET cons_es = replace(cons_es::text, '"Prensas de jerarquía"', '"la jerarquía oprime"')::jsonb
WHERE cons_es::text LIKE '%"Prensas de jerarquía"%';

UPDATE profession_details 
SET cons_pt = replace(cons_pt::text, '"Prensas hierárquicas"', '"a hierarquia oprime"')::jsonb
WHERE cons_pt::text LIKE '%"Prensas hierárquicas"%';

-- 3.6 "все дизайнеры критики" (смысл перевёрнут!)
UPDATE profession_details 
SET cons_hi = replace(cons_hi::text, '"सभी डिज़ाइनर आलोचना करते हैं"', '"सभी डिज़ाइनर आलोचक हैं"')::jsonb
WHERE cons_hi::text LIKE '%"सभी डिज़ाइनर आलोचना करते हैं"%';

UPDATE profession_details 
SET cons_es = replace(cons_es::text, '"Todas las críticas de los diseñadores"', '"todos los diseñadores son críticos"')::jsonb
WHERE cons_es::text LIKE '%"Todas las críticas de los diseñadores"%';

UPDATE profession_details 
SET cons_pt = replace(cons_pt::text, '"Todas as críticas dos designers"', '"todos os designers são críticos"')::jsonb
WHERE cons_pt::text LIKE '%"Todas as críticas dos designers"%';

-- ============================================
-- 4. СРЕДНИЕ И МЕЛКИЕ
-- ============================================

-- 4.1 Неполные предложения
UPDATE profession_details 
SET cons_en = replace(cons_en::text, '"Nobody appreciates"', '"Nobody appreciates you"')::jsonb
WHERE cons_en::text LIKE '%"Nobody appreciates"%';

UPDATE profession_details 
SET cons_en = replace(cons_en::text, '"Parents scream"', '"Parents scream at you"')::jsonb
WHERE cons_en::text LIKE '%"Parents scream"%';

UPDATE profession_details 
SET cons_hi = replace(cons_hi::text, '"कोई सराहना नहीं करता"', '"किसी की सराहना नहीं मिलती"')::jsonb
WHERE cons_hi::text LIKE '%"कोई सराहना नहीं करता"%';

UPDATE profession_details 
SET cons_es = replace(cons_es::text, '"nadie aprecia"', '"nadie te valora"')::jsonb
WHERE cons_es::text LIKE '%"nadie aprecia"%';

UPDATE profession_details 
SET cons_pt = replace(cons_pt::text, '"Ninguém aprecia"', '"Ninguém te valoriza"')::jsonb
WHERE cons_pt::text LIKE '%"Ninguém aprecia"%';

-- 4.2 "огонь, вперёд!" (пожарные)
UPDATE profession_details 
SET cons_en = replace(cons_en::text, '"fire, go!"', '"fire, move out!"')::jsonb
WHERE cons_en::text LIKE '%"fire, go!"%';

-- 4.3 "точность — метр"
UPDATE profession_details 
SET reality_en = replace(reality_en, '"precision - meter"', '"accuracy down to the meter"')
WHERE reality_en LIKE '%"precision - meter"%';

UPDATE profession_details 
SET reality_es = replace(reality_es, '"precisión - medidor"', '"precisión de un metro"')
WHERE reality_es LIKE '%"precisión - medidor"%';

UPDATE profession_details 
SET reality_pt = replace(reality_pt, '"medidor de precisão"', '"precisão de um metro"')
WHERE reality_pt LIKE '%"medidor de precisão"%';

-- 4.4 "зал молчит — ад"
UPDATE profession_details 
SET cons_es = replace(cons_es::text, '"El pasillo está en silencio - infierno"', '"el público en silencio es el infierno"')::jsonb
WHERE cons_es::text LIKE '%"El pasillo está en silencio - infierno"%';

UPDATE profession_details 
SET cons_pt = replace(cons_pt::text, '"O corredor está em silêncio - inferno"', '"o público em silêncio é o inferno"')::jsonb
WHERE cons_pt::text LIKE '%"O corredor está em silêncio - inferno"%';

-- 4.5 "квартал — ночи в офисе"
UPDATE profession_details 
SET cons_en = replace(cons_en::text, '"Quarter - nights in the office"', '"Quarter-end means all-nighters"')::jsonb
WHERE cons_en::text LIKE '%"Quarter - nights in the office"%';

UPDATE profession_details 
SET cons_es = replace(cons_es::text, '"Cuartos de noche en la oficina"', '"los cierres trimestrales son noches en la oficina"')::jsonb
WHERE cons_es::text LIKE '%"Cuartos de noche en la oficina"%';

UPDATE profession_details 
SET cons_pt = replace(cons_pt::text, '"Trimestre - noites no escritório"', '"o fechamento do trimestre significa noites no escritório"')::jsonb
WHERE cons_pt::text LIKE '%"Trimestre - noites no escritório"%';

UPDATE profession_details 
SET cons_hi = replace(cons_hi::text, '"तिमाही - कार्यालय में रातें"', '"तिमाही के अंत में रात भर काम"')::jsonb
WHERE cons_hi::text LIKE '%"तिमाही - कार्यालय में रातें"%';

-- 4.6 "ошибка = репутация"
UPDATE profession_details 
SET cons_en = replace(cons_en::text, '"Responsibility - error = reputation"', '"one mistake ruins your reputation"')::jsonb
WHERE cons_en::text LIKE '%"Responsibility - error = reputation"%';

UPDATE profession_details 
SET cons_es = replace(cons_es::text, '"Responsabilidad - error = reputación"', '"un error arruina tu reputación"')::jsonb
WHERE cons_es::text LIKE '%"Responsabilidad - error = reputación"%';

UPDATE profession_details 
SET cons_pt = replace(cons_pt::text, '"Responsabilidade - erro = reputação"', '"um erro arruína sua reputação"')::jsonb
WHERE cons_pt::text LIKE '%"Responsabilidade - erro = reputação"%';

UPDATE profession_details 
SET cons_hi = replace(cons_hi::text, '"उत्तरदायित्व - त्रुटि = प्रतिष्ठा"', '"एक गलती से प्रतिष्ठा खतरे में"')::jsonb
WHERE cons_hi::text LIKE '%"उत्तरदायित्व - त्रुटि = प्रतिष्ठा"%';

-- 4.7 "ошибка = суд"
UPDATE profession_details 
SET cons_en = replace(cons_en::text, '"Responsibility - error = court"', '"one mistake means court"')::jsonb
WHERE cons_en::text LIKE '%"Responsability - error = court"%';

UPDATE profession_details 
SET cons_es = replace(cons_es::text, '"Responsabilidad - error = tribunal"', '"un error y te llevan a juicio"')::jsonb
WHERE cons_es::text LIKE '%"Responsabilidad - error = tribunal"%';

UPDATE profession_details 
SET cons_pt = replace(cons_pt::text, '"Responsabilidade - erro = tribunal"', '"um erro e você vai a julgamento"')::jsonb
WHERE cons_pt::text LIKE '%"Responsabilidade - erro = tribunal"%';

UPDATE profession_details 
SET cons_hi = replace(cons_hi::text, '"उत्तरदायित्व - त्रुटि = न्यायालय"', '"एक गलती और मुकदमा"')::jsonb
WHERE cons_hi::text LIKE '%"उत्तरदायित्व - त्रुटि = न्यायालय"%';

-- ============================================
-- 5. ЛОГИРОВАНИЕ
-- ============================================

INSERT INTO translation_fix_log (table_name, field_name, language, fix_type, fixed_by)
VALUES 
('profession_details', 'cons_es', 'es', 'critical', 'batch_script'),
('profession_details', 'cons_pt', 'pt', 'critical', 'batch_script'),
('profession_details', 'cons_hi', 'hi', 'critical', 'batch_script'),
('profession_details', 'cons_en', 'en', 'major', 'batch_script');

-- ============================================
-- 6. ПРОВЕРКА (не удаляй, это для контроля)
-- ============================================

SELECT 'CRITICAL CHECK: crujido' as check_name, COUNT(*) as remaining
FROM profession_details WHERE cons_es::text LIKE '%crujido%'
UNION ALL
SELECT 'CRITICAL CHECK: La voz se sienta', COUNT(*)
FROM profession_details WHERE cons_es::text LIKE '%"La voz se sienta"%'
UNION ALL
SELECT 'CRITICAL CHECK: A voz se senta', COUNT(*)
FROM profession_details WHERE cons_pt::text LIKE '%"A voz se senta"%'
UNION ALL
SELECT 'CRITICAL CHECK: Papeles más gente', COUNT(*)
FROM profession_details WHERE cons_es::text LIKE '%Papeles más gente%'
UNION ALL
SELECT 'CRITICAL CHECK: Artículos más análisis', COUNT(*)
FROM profession_details WHERE cons_es::text LIKE '%Artículos más análisis%';