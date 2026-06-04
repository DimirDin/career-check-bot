"""locales/es.py — Español"""

STRINGS: dict[str, str] = {

    "lang_code":        "es",
    "lang_flag":        "🇪🇸",

    "welcome_title":    "\n           <b>CAREERCHECK — TEST DE APTITUD PROFESIONAL</b>          \n",
    "welcome_subtitle": (
        "  🧠 Basado en el modelo científico <b>Big Five + RIASEC</b>       \n"
        "  📋 60 preguntas • 5 rasgos de personalidad • 6 tipos de carrera        \n"
        "  🏆 30 profesiones detalladas • Análisis personalizado      \n"
    ),
    "welcome_body": (
        "<b>QUÉ MEDIMOS</b>\n\n"
        "Tu combinación única de 5 rasgos fundamentales de personalidad que determinan "
        "dónde serás feliz — y dónde te agotarás.\n\n"
        "• <b>Apertura (O)</b> — creatividad, curiosidad, pensamiento abstracto\n"
        "• <b>Responsabilidad (C)</b> — organización, disciplina, fiabilidad\n"
        "• <b>Extraversión (E)</b> — energía de las personas, persuasión, liderazgo\n"
        "• <b>Amabilidad (A)</b> — empatía, armonía, cuidado de los demás\n"
        "• <b>Estabilidad emocional (S)</b> — resistencia al estrés, confianza, calma\n\n"
        "<b>🎯 QUÉ OBTENDRÁS</b>\n\n"
        "No solo «eres bueno para gerente».\n"
        "Un análisis detallado: por qué, cuánto, qué será difícil, "
        "cómo mejorar — la realidad de la profesión sin adornos.\n\n"
        "<b>🏆 30 PROFESIONES — DEL TÉCNICO AL EMPRESARIO</b>\n\n"
        "No solo IT. Para todos.\n"
        "Realistas. Investigadores. Artísticos. Sociales. Emprendedores. Convencionales.\n\n"
        "Cada uno encontrará su lugar.\n\n"
        "⚡ <b>15 MINUTOS — Y TE CONOCERÁS MEJOR QUE EL 90% DE LAS PERSONAS</b>"
    ),
    "welcome_footer":   "\n\n<i>Creado por @Dimirdin</i>",

    "btn_start_test":   "🚀 Comenzar test",
    "btn_about_test":   "📖 Sobre el test",
    "btn_my_result":    "📋 Mi resultado",
    "btn_share":        "📤 Compartir",
    "btn_retake":       "🔄 Repetir test",
    "btn_home":         "🏠 Inicio",
    "btn_resume":       "▶️ Continuar test",
    "btn_start_fresh":  "🔄 Empezar de nuevo",
    "btn_save_exit":    "💾 Guardar progreso",
    "btn_clear_exit":   "🗑️ Eliminar progreso",

    "resume_found": (
        "⏸️ <b>¡Tienes un test sin terminar!</b>\n\n"
        "Completado: <b>{completed} de 60 preguntas</b> ({percent}%)\n"
        "Quedan aproximadamente <b>{minutes_left} minutos</b>\n\n"
        "¿Quieres continuar desde donde lo dejaste?"
    ),

    "test_started": (
        "✅ <b>¡Test iniciado!</b>\n\n"
        "60 preguntas, ~15 minutos. Responde con honestidad — la precisión depende de ello."
    ),
    "test_resumed": (
        "▶️ <b>¡Continuamos!</b>\n\n"
        "Pregunta {q_num} de 60.\n"
        "Responde con honestidad."
    ),
    "question_header":  "📊 Pregunta {current} de {total}  {progress_bar}\n\n📝 {question}\n\nElige:",
    "answer_no":        "❌ No",
    "answer_rather_no": "🤔 Más bien no",
    "answer_neutral":   "😐 Neutral",
    "answer_rather_yes":"✅ Más bien sí",
    "answer_yes":       "💯 Sí",

    "honesty_warning": (
        "🤔 <b>Espera un momento</b>\n\n"
        "Estás respondiendo {label} al <b>{ratio}%</b> de las preguntas.\n\n"
        "Está bien si es honesto. Pero si estás respondiendo al azar — "
        "el resultado será inexacto.\n\n"
        "<i>Continúa — solo responde como realmente son las cosas.</i>"
    ),

    "test_done_intro":  "🎉 <b>¡Test completado!</b>\n\n",
    "profile_header":   "📊 <b>Tu perfil (0–100):</b>\n",
    "trait_O":          "Apertura",
    "trait_C":          "Responsabilidad",
    "trait_E":          "Extraversión",
    "trait_A":          "Amabilidad",
    "trait_S":          "Estabilidad emocional",
    "riasec_line":      "🎯 <b>RIASEC:</b> R:{R} I:{I} A:{A} S:{S} E:{E} C:{C}\n\n",
    "professions_coming":"<b>Ahora te mostraré tus 3 profesiones principales con análisis detallado...</b>",
    "generating_pdf":   "📄 Generando informe PDF, un momento...",
    "pdf_caption":      "📄 Tu informe personal de CareerCheck",
    "whats_next":       "✨ <b>¡Listo!</b> ¿Qué sigue?",

    "generating_card":  "🎨 Generando tarjeta...",
    "share_caption": (
        "📤 <b>¡Guarda y comparte tu resultado!</b>\n\n"
        "Envíalo a amigos — que ellos también descubran su tipo 👇\n"
        "t.me/CareerCheck_Bot"
    ),

    "myresult_header":  "📋 <b>Tu último resultado</b>\n<i>Fecha: {date}</i>\n\n",
    "myresult_type":    "🎯 <b>Tipo de personalidad: {label}</b>\n\n",
    "myresult_big5":    "📊 <b>Perfil Big Five:</b>\n",
    "myresult_top":     "🏆 <b>Profesiones principales:</b>\n",
    "no_result":        "📭 Aún sin resultados. /start para tomar el test.",
    "not_registered":   "❌ Todavía no has tomado el test. /start para comenzar.",

    "prof_why_fits":    "<b>📌 Por qué TE conviene:</b>\n",
    "prof_compat":      "<b>📊 Compatibilidad de rasgos:</b>\n",
    "prof_growth":      "📈 <b>Potencial de crecimiento:</b> {growth}\n",
    "prof_reality":     "\n<b>⚡ Realidad de la profesión:</b>\n{reality}\n",
    "prof_pros":        "\n<b>✅ Ventajas:</b>\n",
    "prof_cons":        "\n<b>❌ Desventajas:</b>\n",

    "cancel_confirm": (
        "⚠️ <b>¡Test sin terminar!</b>\n\n"
        "Respondiste <b>{current} de 60</b> preguntas.\n"
        "¿Guardar progreso para continuar después?"
    ),
    "cancelled":        "❌ Cancelado. /start para comenzar.",
    "progress_saved": (
        "✅ <b>¡Progreso guardado!</b>\n\n"
        "Vuelve cuando quieras — continuarás desde la misma pregunta.\n"
        "Presiona /start — el bot te ofrecerá retomar."
    ),
    "progress_cleared": "❌ Test cancelado. /start para comenzar.",

    "about_text": (
        "<b>📚 CÓMO FUNCIONA EL TEST</b>\n\n"
        "<b>Paso 1:</b> 60 preguntas en escala de «totalmente en desacuerdo» a «totalmente de acuerdo»\n"
        "<b>Paso 2:</b> El algoritmo calcula 5 rasgos de personalidad (Big Five)\n"
        "<b>Paso 3:</b> Mapeo a 6 tipos de carrera (RIASEC)\n"
        "<b>Paso 4:</b> Comparación con 30 profesiones reales\n"
        "<b>Paso 5:</b> Análisis personalizado con recomendaciones\n\n"
        "<b>🔬 Base científica:</b>\n"
        "• Big Five — el modelo de personalidad más validado (miles de estudios)\n"
        "• RIASEC — teoría de John Holland, más de 50 años en orientación profesional\n\n"
        "<b>⚠️ Importante:</b>\n"
        "• No hay respuestas correctas — sé honesto\n"
        "• El resultado es un punto de partida, no un veredicto\n"
        "• Los rasgos pueden cambiar y desarrollarse con el tiempo\n\n"
        "<i>Creado por @Dimirdin</i>"
    ),

    "help_text": (
        "<b>📖 Comandos:</b>\n"
        "/start — tomar el test\n"
        "/myresult — ver último resultado\n"
        "/help — ayuda\n"
        "/cancel — cancelar el test\n\n"
        "<b>Sobre el test:</b>\n"
        "60 preguntas, 15 minutos, modelo científico Big Five + RIASEC.\n"
        "30 profesiones con análisis detallado.\n\n"
        "Responde con honestidad — el algoritmo detectará inconsistencias.\n\n"
        "<i>Creado por @Dimirdin</i>"
    ),

    "about_creator": (
        "👨‍💻 <b>Sobre este bot</b>\n\n"
        "CareerCheck fue creado por @Dimirdin.\n\n"
        "Stack: Python • aiogram 3 • PostgreSQL • ReportLab • matplotlib\n"
        "Modelo: Big Five + RIASEC\n\n"
        "Preguntas y sugerencias: @Dimirdin"
    ),

    "err_generic":      "❌ Error. /cancel y /start",
    "err_no_questions": "❌ Preguntas no cargadas.",
    "err_no_progress":  "❌ Progreso no encontrado. /start",
    "wait_processing":  "⏳ Un momento...",

    "riasec_R": (
        "🔧 <b>Realista (Realistic)</b>\n\n"
        "Disfrutas trabajar con las manos, con tecnología, con la naturaleza. "
        "Te importan los resultados concretos — ver, tocar, arreglar.\n\n"
        "<b>Tu superpoder:</b> hacer lo que funciona. No discutir, hacer.\n"
        "<b>Tu punto ciego:</b> debates abstractos, política de oficina.\n\n"
        "<b>Mejores entornos:</b> talleres, cocinas, campos, carreteras, construcción\n"
        "<b>Peores entornos:</b> salas de reuniones, laboratorios, brainstormings"
    ),
    "riasec_I": (
        "🔬 <b>Investigador (Investigative)</b>\n\n"
        "Necesitas entender cómo funciona el mundo. Haces preguntas que otros no hacen. "
        "Datos, patrones, hipótesis — ese es tu lenguaje.\n\n"
        "<b>Tu superpoder:</b> ver conexiones donde otros ven caos.\n"
        "<b>Tu punto ciego:</b> detalles, rutina, dramas emocionales.\n\n"
        "<b>Mejores entornos:</b> laboratorios, I+D, centros de análisis\n"
        "<b>Peores entornos:</b> ventas, soporte al cliente"
    ),
    "riasec_A": (
        "🎨 <b>Artístico (Artistic)</b>\n\n"
        "No soportas las plantillas. Tu valor es la unicidad de perspectiva y estilo. "
        "Creas lo que antes no existía.\n\n"
        "<b>Tu superpoder:</b> ver belleza y significado donde otros no ven nada.\n"
        "<b>Tu punto ciego:</b> plazos, burocracia, «hazlo como todos».\n\n"
        "<b>Mejores entornos:</b> estudios, agencias, freelance, escenario\n"
        "<b>Peores entornos:</b> bancos, corporaciones rígidas, cadenas de producción"
    ),
    "riasec_S": (
        "🤝 <b>Social (Social)</b>\n\n"
        "Te energizas con las personas. No solo «te gustan las personas» — las entiendes, "
        "las sientes, les ayudas a crecer.\n\n"
        "<b>Tu superpoder:</b> generar confianza en minutos, no en meses.\n"
        "<b>Tu punto ciego:</b> conflictos sin resolver, trabajo aislado.\n\n"
        "<b>Mejores entornos:</b> escuelas, clínicas, RRHH, coaching\n"
        "<b>Peores entornos:</b> trabajo solitario, equipos competitivos"
    ),
    "riasec_E": (
        "💼 <b>Emprendedor (Enterprising)</b>\n\n"
        "Obtienes energía de la persuasión, negociación e influencia. "
        "Te aburre ejecutar — quieres liderar, crear, arriesgar.\n\n"
        "<b>Tu superpoder:</b> ver oportunidades donde otros ven problemas.\n"
        "<b>Tu punto ciego:</b> detalles, rutina, planificación a largo plazo.\n\n"
        "<b>Mejores entornos:</b> startups, ventas, política, consultoría\n"
        "<b>Peores entornos:</b> bibliotecas, laboratorios, jerarquía estricta"
    ),
    "riasec_C": (
        "📋 <b>Convencional (Conventional)</b>\n\n"
        "Eres el pilar. En un mundo de caos creas orden. "
        "Necesitas claridad: quién, qué, cuándo, cuánto.\n\n"
        "<b>Tu superpoder:</b> simplificar lo complejo mediante sistemas y procesos.\n"
        "<b>Tu punto ciego:</b> incertidumbre, «piénsalo tú», cambios constantes.\n\n"
        "<b>Mejores entornos:</b> contabilidad, administración, auditoría, logística\n"
        "<b>Peores entornos:</b> startups sin procesos, caos creativo"
    ),

    "pdf_subtitle":     "Informe Personal",
    "pdf_subtitle2":    "Profesiones Recomendadas",
    "pdf_section_type": "TIPO DE PERSONALIDAD",
    "pdf_section_big5": "PERFIL BIG FIVE",
    "pdf_section_riasec":"PERFIL RIASEC",
    "pdf_section_growth":"ÁREAS DE DESARROLLO",
    "pdf_section_top3": "TUS 3 PROFESIONES PRINCIPALES",
    "pdf_dom_label":    "Tipo de personalidad dominante según RIASEC",
    "pdf_footer_center":"Tu resultado es un punto de partida, no un veredicto",
    "pdf_footer_left":  "CareerCheck  t.me/CareerCheck_Bot  @Dimirdin",
    "pdf_growth_tips": {
        "O": ("Apertura",         "Lee no-ficción, prueba un nuevo hobby cada mes."),
        "C": ("Responsabilidad",  "Gestor de tareas, time-blocking, regla de 2 minutos."),
        "E": ("Extraversión",     "Hablar en público, meetups, mentoring."),
        "A": ("Amabilidad",       "Escucha activa, voluntariado, comunicación no violenta."),
        "S": ("Estabilidad",      "Deporte, rutina de sueño, meditación, reducir carga."),
    },
    "pdf_pros":         "Ventajas",
    "pdf_cons":         "Desventajas",
    "pdf_prospects":    "Potencial de crecimiento",

    "card_your_type":   "TU TIPO DE PERSONALIDAD",
    "card_big5_title":  "Big Five",
    "card_riasec_title":"RIASEC",
    "card_profile":     "PERFIL DE PERSONALIDAD",
    "card_top_profs":   "PROFESIONES PRINCIPALES",
    "card_footer":      "Descubre tu tipo de carrera  →  t.me/CareerCheck_Bot",
    "card_trait_names": ["Apertura", "Responsabilidad", "Extraversión", "Amabilidad", "Estabilidad"],
    "card_riasec_names":["Realista", "Investigador", "Artístico", "Social", "Emprendedor", "Convenc."],
    "card_riasec_labels":{
        "R": "REALISTA", "I": "INVESTIGADOR", "A": "ARTÍSTICO",
        "S": "SOCIAL", "E": "EMPRENDEDOR", "C": "CONVENCIONAL",
    },
}
