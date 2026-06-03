"""locales/pt.py — Português (Brasil)"""

STRINGS: dict[str, str] = {

    "lang_code":        "pt",
    "lang_flag":        "🇧🇷",

    "welcome_title":    "\n           <b>CAREERCHECK — TESTE DE APTIDÃO PROFISSIONAL</b>          \n",
    "welcome_subtitle": (
        "  🧠 Baseado no modelo científico <b>Big Five + RIASEC</b>       \n"
        "  📋 60 perguntas • 5 traços de personalidade • 6 tipos de carreira        \n"
        "  🏆 30 profissões detalhadas • Análise personalizada      \n"
    ),
    "welcome_body": (
        "<b>O QUE MEDIMOS</b>\n\n"
        "Sua combinação única de 5 traços fundamentais de personalidade que determinam "
        "onde você será feliz — e onde vai se esgotar.\n\n"
        "• <b>Abertura (O)</b> — criatividade, curiosidade, pensamento abstrato\n"
        "• <b>Conscienciosidade (C)</b> — organização, disciplina, confiabilidade\n"
        "• <b>Extroversão (E)</b> — energia das pessoas, persuasão, liderança\n"
        "• <b>Amabilidade (A)</b> — empatia, harmonia, cuidado com os outros\n"
        "• <b>Estabilidade emocional (S)</b> — resiliência ao estresse, confiança, calma\n\n"
        "<b>🎯 O QUE VOCÊ VAI RECEBER</b>\n\n"
        "Não apenas «você seria um bom gerente».\n"
        "Uma análise detalhada: por quê, quanto, o que será difícil, "
        "como melhorar — a realidade da profissão sem rodeios.\n\n"
        "<b>🏆 30 PROFISSÕES — DO TÉCNICO AO EMPREENDEDOR</b>\n\n"
        "Não só TI. Para todos.\n"
        "Realistas. Investigativos. Artísticos. Sociais. Empreendedores. Convencionais.\n\n"
        "Todo mundo vai encontrar seu lugar.\n\n"
        "⚡ <b>15 MINUTOS — E VOCÊ SE CONHECERÁ MELHOR QUE 90% DAS PESSOAS</b>"
    ),
    "welcome_footer":   "\n\n<i>Criado por @Dimirdin</i>",

    "btn_start_test":   "🚀 Iniciar teste",
    "btn_about_test":   "📖 Sobre o teste",
    "btn_my_result":    "📋 Meu resultado",
    "btn_share":        "📤 Compartilhar",
    "btn_retake":       "🔄 Refazer teste",
    "btn_home":         "🏠 Início",
    "btn_resume":       "▶️ Continuar teste",
    "btn_start_fresh":  "🔄 Começar do zero",
    "btn_save_exit":    "💾 Salvar progresso",
    "btn_clear_exit":   "🗑️ Apagar progresso",

    "resume_found": (
        "⏸️ <b>Você tem um teste inacabado!</b>\n\n"
        "Concluído: <b>{completed} de 60 perguntas</b> ({percent}%)\n"
        "Restam aproximadamente <b>{minutes_left} minutos</b>\n\n"
        "Deseja continuar de onde parou?"
    ),

    "test_started": (
        "✅ <b>Teste iniciado!</b>\n\n"
        "60 perguntas, ~15 minutos. Responda com honestidade — a precisão depende disso."
    ),
    "test_resumed": (
        "▶️ <b>Continuando!</b>\n\n"
        "Pergunta {q_num} de 60.\n"
        "Responda com honestidade."
    ),
    "question_header":  "📊 Pergunta {current} de {total}  {progress_bar}\n\n📝 {question}\n\nEscolha:",
    "answer_no":        "❌ Não",
    "answer_rather_no": "🤔 Mais não",
    "answer_neutral":   "😐 Neutro",
    "answer_rather_yes":"✅ Mais sim",
    "answer_yes":       "💯 Sim",

    "honesty_warning": (
        "🤔 <b>Aguarde um momento</b>\n\n"
        "Você está respondendo {label} para <b>{ratio}%</b> das perguntas.\n\n"
        "Tudo bem se for honesto. Mas se estiver respondendo aleatoriamente — "
        "o resultado será impreciso.\n\n"
        "<i>Continue — apenas responda como as coisas realmente são.</i>"
    ),

    "test_done_intro":  "🎉 <b>Teste concluído!</b>\n\n",
    "profile_header":   "📊 <b>Seu perfil (0–100):</b>\n",
    "trait_O":          "Abertura",
    "trait_C":          "Conscienciosidade",
    "trait_E":          "Extroversão",
    "trait_A":          "Amabilidade",
    "trait_S":          "Estabilidade emocional",
    "riasec_line":      "🎯 <b>RIASEC:</b> R:{R} I:{I} A:{A} S:{S} E:{E} C:{C}\n\n",
    "professions_coming":"<b>Agora vou mostrar suas 3 principais profissões com análise detalhada...</b>",
    "generating_pdf":   "📄 Gerando relatório PDF, um momento...",
    "pdf_caption":      "📄 Seu relatório pessoal CareerCheck",
    "whats_next":       "✨ <b>Pronto!</b> O que vem a seguir?",

    "generating_card":  "🎨 Gerando cartão...",
    "share_caption": (
        "📤 <b>Salve e compartilhe seu resultado!</b>\n\n"
        "Envie para amigos — que eles também descubram seu tipo 👇\n"
        "t.me/CareerCheck_Bot"
    ),

    "myresult_header":  "📋 <b>Seu último resultado</b>\n<i>Data: {date}</i>\n\n",
    "myresult_type":    "🎯 <b>Tipo de personalidade: {label}</b>\n\n",
    "myresult_big5":    "📊 <b>Perfil Big Five:</b>\n",
    "myresult_top":     "🏆 <b>Principais profissões:</b>\n",
    "no_result":        "📭 Ainda sem resultados. /start para fazer o teste.",
    "not_registered":   "❌ Você ainda não fez o teste. /start para começar.",

    "prof_why_fits":    "<b>📌 Por que é ideal para VOCÊ:</b>\n",
    "prof_compat":      "<b>📊 Compatibilidade de traços:</b>\n",
    "prof_growth":      "📈 <b>Potencial de crescimento:</b> {growth}\n",
    "prof_reality":     "\n<b>⚡ Realidade da profissão:</b>\n{reality}\n",
    "prof_pros":        "\n<b>✅ Prós:</b>\n",
    "prof_cons":        "\n<b>❌ Contras:</b>\n",

    "cancel_confirm": (
        "⚠️ <b>Teste não concluído!</b>\n\n"
        "Você respondeu <b>{current} de 60</b> perguntas.\n"
        "Salvar progresso para continuar depois?"
    ),
    "cancelled":        "❌ Cancelado. /start para começar.",
    "progress_saved": (
        "✅ <b>Progresso salvo!</b>\n\n"
        "Volte quando quiser — continuará da mesma pergunta.\n"
        "Pressione /start — o bot oferecerá retomar."
    ),
    "progress_cleared": "❌ Teste cancelado. /start para começar.",

    "about_text": (
        "<b>📚 COMO O TESTE FUNCIONA</b>\n\n"
        "<b>Passo 1:</b> 60 perguntas numa escala de «discordo totalmente» a «concordo totalmente»\n"
        "<b>Passo 2:</b> O algoritmo calcula 5 traços de personalidade (Big Five)\n"
        "<b>Passo 3:</b> Mapeamento para 6 tipos de carreira (RIASEC)\n"
        "<b>Passo 4:</b> Correspondência com 30 profissões reais\n"
        "<b>Passo 5:</b> Análise personalizada com recomendações\n\n"
        "<b>⚠️ Importante:</b>\n"
        "• Não há respostas certas — seja honesto\n"
        "• O resultado é um ponto de partida, não um veredito\n"
        "• Os traços podem mudar e ser desenvolvidos ao longo do tempo\n\n"
        "<i>Criado por @Dimirdin</i>"
    ),

    "help_text": (
        "<b>📖 Comandos:</b>\n"
        "/start — fazer o teste\n"
        "/myresult — ver último resultado\n"
        "/help — ajuda\n"
        "/cancel — cancelar o teste\n\n"
        "<b>Sobre o teste:</b>\n"
        "60 perguntas, 15 minutos, modelo científico Big Five + RIASEC.\n\n"
        "<i>Criado por @Dimirdin</i>"
    ),

    "about_creator": (
        "👨‍💻 <b>Sobre este bot</b>\n\n"
        "CareerCheck foi criado por @Dimirdin.\n\n"
        "Stack: Python • aiogram 3 • PostgreSQL • ReportLab • matplotlib\n"
        "Modelo: Big Five + RIASEC\n\n"
        "Perguntas e sugestões: @Dimirdin"
    ),

    "err_generic":      "❌ Erro. /cancel e /start",
    "err_no_questions": "❌ Perguntas não carregadas.",
    "err_no_progress":  "❌ Progresso não encontrado. /start",
    "wait_processing":  "⏳ Um momento...",

    "riasec_R": (
        "🔧 <b>Realista (Realistic)</b>\n\n"
        "Você gosta de trabalhar com as mãos, com tecnologia, com a natureza. "
        "Você se importa com resultados concretos — ver, tocar, consertar.\n\n"
        "<b>Seu superpoder:</b> fazer o que funciona. Não discutir, fazer.\n"
        "<b>Seu ponto cego:</b> debates abstratos, política de escritório.\n\n"
        "<b>Melhores ambientes:</b> oficinas, cozinhas, campos, estradas, construção\n"
        "<b>Piores ambientes:</b> salas de reunião, laboratórios, brainstormings"
    ),
    "riasec_I": (
        "🔬 <b>Investigativo (Investigative)</b>\n\n"
        "Você precisa entender como o mundo funciona. Você faz perguntas que outros não fazem. "
        "Dados, padrões, hipóteses — essa é a sua linguagem.\n\n"
        "<b>Seu superpoder:</b> ver conexões onde outros veem caos.\n"
        "<b>Seu ponto cego:</b> detalhes, rotina, dramas emocionais.\n\n"
        "<b>Melhores ambientes:</b> laboratórios, P&D, centros de análise\n"
        "<b>Piores ambientes:</b> vendas, suporte ao cliente"
    ),
    "riasec_A": (
        "🎨 <b>Artístico (Artistic)</b>\n\n"
        "Você não suporta modelos prontos. Seu valor é a unicidade de perspectiva e estilo. "
        "Você cria o que antes não existia.\n\n"
        "<b>Seu superpoder:</b> ver beleza e significado onde outros não veem nada.\n"
        "<b>Seu ponto cego:</b> prazos, burocracia, «faça como todos».\n\n"
        "<b>Melhores ambientes:</b> estúdios, agências, freelance, palco\n"
        "<b>Piores ambientes:</b> bancos, corporações rígidas, linha de produção"
    ),
    "riasec_S": (
        "🤝 <b>Social (Social)</b>\n\n"
        "Você se energiza com as pessoas. Não apenas «gostar de pessoas» — você as entende, "
        "as sente, ajuda a crescer.\n\n"
        "<b>Seu superpoder:</b> criar confiança em minutos, não meses.\n"
        "<b>Seu ponto cego:</b> conflitos não resolvidos, trabalho isolado.\n\n"
        "<b>Melhores ambientes:</b> escolas, clínicas, RH, coaching\n"
        "<b>Piores ambientes:</b> trabalho solitário, equipes competitivas"
    ),
    "riasec_E": (
        "💼 <b>Empreendedor (Enterprising)</b>\n\n"
        "Você ganha energia da persuasão, negociação e influência. "
        "Se entedia executando — quer liderar, criar, arriscar.\n\n"
        "<b>Seu superpoder:</b> ver oportunidades onde outros veem problemas.\n"
        "<b>Seu ponto cego:</b> detalhes, rotina, planejamento de longo prazo.\n\n"
        "<b>Melhores ambientes:</b> startups, vendas, política, consultoria\n"
        "<b>Piores ambientes:</b> bibliotecas, laboratórios, hierarquia rígida"
    ),
    "riasec_C": (
        "📋 <b>Convencional (Conventional)</b>\n\n"
        "Você é o pilar. Em um mundo de caos você cria ordem. "
        "Você precisa de clareza: quem, o quê, quando, quanto.\n\n"
        "<b>Seu superpoder:</b> simplificar o complexo através de sistemas e processos.\n"
        "<b>Seu ponto cego:</b> incerteza, «descubra você mesmo», mudanças constantes.\n\n"
        "<b>Melhores ambientes:</b> contabilidade, administração, auditoria, logística\n"
        "<b>Piores ambientes:</b> startups sem processos, caos criativo"
    ),

    "pdf_subtitle":     "Relatório Pessoal",
    "pdf_subtitle2":    "Profissões Recomendadas",
    "pdf_section_type": "TIPO DE PERSONALIDADE",
    "pdf_section_big5": "PERFIL BIG FIVE",
    "pdf_section_riasec":"PERFIL RIASEC",
    "pdf_section_growth":"ÁREAS DE DESENVOLVIMENTO",
    "pdf_section_top3": "SUAS 3 PRINCIPAIS PROFISSÕES",
    "pdf_dom_label":    "Tipo de personalidade dominante segundo RIASEC",
    "pdf_footer_center":"Seu resultado é um ponto de partida, não um veredito",
    "pdf_footer_left":  "CareerCheck  t.me/CareerCheck_Bot  @Dimirdin",
    "pdf_growth_tips": {
        "O": ("Abertura",           "Leia não-ficção, experimente um novo hobby todo mês."),
        "C": ("Conscienciosidade",  "Gerenciador de tarefas, time-blocking, regra dos 2 minutos."),
        "E": ("Extroversão",        "Falar em público, meetups, mentoria."),
        "A": ("Amabilidade",        "Escuta ativa, voluntariado, comunicação não-violenta."),
        "S": ("Estabilidade",       "Exercício, rotina de sono, meditação, reduzir sobrecarga."),
    },
    "pdf_pros":         "Prós",
    "pdf_cons":         "Contras",
    "pdf_prospects":    "Potencial de crescimento",

    "card_your_type":   "SEU TIPO DE PERSONALIDADE",
    "card_big5_title":  "Big Five",
    "card_riasec_title":"RIASEC",
    "card_profile":     "PERFIL DE PERSONALIDADE",
    "card_top_profs":   "PRINCIPAIS PROFISSÕES",
    "card_footer":      "Descubra seu tipo de carreira  →  t.me/CareerCheck_Bot",
    "card_trait_names": ["Abertura", "Conscienciosidade", "Extroversão", "Amabilidade", "Estabilidade"],
    "card_riasec_names":["Realista", "Investigativo", "Artístico", "Social", "Empreendedor", "Convenc."],
    "card_riasec_labels":{
        "R": "REALISTA", "I": "INVESTIGATIVO", "A": "ARTÍSTICO",
        "S": "SOCIAL", "E": "EMPREENDEDOR", "C": "CONVENCIONAL",
    },
}
