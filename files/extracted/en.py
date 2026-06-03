"""locales/en.py — English"""

STRINGS: dict[str, str] = {

    "lang_code":        "en",
    "lang_flag":        "🇬🇧",

    "welcome_title":    "\n           <b>CAREERCHECK — CAREER FIT TEST</b>          \n",
    "welcome_subtitle": (
        "  🧠 Based on the scientific <b>Big Five + RIASEC</b> model       \n"
        "  📋 60 questions • 5 personality traits • 6 career types        \n"
        "  🏆 30 detailed professions • Personalised analysis      \n"
    ),
    "welcome_body": (
        "<b>WHAT WE MEASURE</b>\n\n"
        "Your unique combination of 5 core personality traits that determine "
        "where you will thrive — and where you will burn out.\n\n"
        "• <b>Openness (O)</b> — creativity, curiosity, abstract thinking\n"
        "• <b>Conscientiousness (C)</b> — organisation, discipline, reliability\n"
        "• <b>Extraversion (E)</b> — energy from people, persuasion, leadership\n"
        "• <b>Agreeableness (A)</b> — empathy, harmony, care for others\n"
        "• <b>Emotional Stability (S)</b> — stress resilience, confidence, calm\n\n"
        "<b>🎯 WHAT YOU WILL GET</b>\n\n"
        "Not just «you'd make a good manager».\n"
        "A detailed breakdown: why, how much, what will be hard, "
        "how to grow — the reality of the profession, no sugarcoating.\n\n"
        "<b>🏆 30 PROFESSIONS — FROM TECHNICIAN TO ENTREPRENEUR</b>\n\n"
        "Not just IT. Everyone.\n"
        "Realistic. Investigative. Artistic. Social. "
        "Enterprising. Conventional.\n\n"
        "Everyone will find their fit.\n\n"
        "⚡ <b>15 MINUTES — AND YOU KNOW YOURSELF BETTER THAN 90% OF PEOPLE</b>"
    ),
    "welcome_footer":   "\n\n<i>Created by @Dimirdin</i>",

    "btn_start_test":   "🚀 Start test",
    "btn_about_test":   "📖 About the test",
    "btn_my_result":    "📋 My result",
    "btn_share":        "📤 Share",
    "btn_retake":       "🔄 Retake test",
    "btn_home":         "🏠 Home",
    "btn_resume":       "▶️ Resume test",
    "btn_start_fresh":  "🔄 Start over",
    "btn_save_exit":    "💾 Save progress",
    "btn_clear_exit":   "🗑️ Delete progress",

    "resume_found": (
        "⏸️ <b>You have an unfinished test!</b>\n\n"
        "Completed: <b>{completed} of 60 questions</b> ({percent}%)\n"
        "About <b>{minutes_left} minutes</b> remaining\n\n"
        "Would you like to continue where you left off?"
    ),

    "test_started": (
        "✅ <b>Test started!</b>\n\n"
        "60 questions, ~15 minutes. Answer honestly — accuracy depends on it."
    ),
    "test_resumed": (
        "▶️ <b>Continuing!</b>\n\n"
        "Question {q_num} of 60.\n"
        "Answer honestly — accuracy depends on it."
    ),
    "question_header":  "📊 Question {current} of {total}  {progress_bar}\n\n📝 {question}\n\nChoose:",
    "answer_no":        "❌ No",
    "answer_rather_no": "🤔 Rather no",
    "answer_neutral":   "😐 Neutral",
    "answer_rather_yes":"✅ Rather yes",
    "answer_yes":       "💯 Yes",

    "honesty_warning": (
        "🤔 <b>Wait a moment</b>\n\n"
        "You are answering {label} for <b>{ratio}%</b> of questions.\n\n"
        "That's fine if it's honest. But if you're answering randomly — "
        "your result will be inaccurate.\n\n"
        "<i>Keep going — just answer how things really are.</i>"
    ),

    "test_done_intro":  "🎉 <b>Test complete!</b>\n\n",
    "profile_header":   "📊 <b>Your profile (0–100):</b>\n",
    "trait_O":          "Openness",
    "trait_C":          "Conscientiousness",
    "trait_E":          "Extraversion",
    "trait_A":          "Agreeableness",
    "trait_S":          "Emotional Stability",
    "riasec_line":      "🎯 <b>RIASEC:</b> R:{R} I:{I} A:{A} S:{S} E:{E} C:{C}\n\n",
    "professions_coming":"<b>Now I'll show your top-3 professions with detailed analysis...</b>",
    "generating_pdf":   "📄 Generating PDF report, one moment...",
    "pdf_caption":      "📄 Your personal CareerCheck report",
    "whats_next":       "✨ <b>Done!</b> What's next?",

    "generating_card":  "🎨 Generating card...",
    "share_caption": (
        "📤 <b>Save and share your result!</b>\n\n"
        "Send to friends — let them discover their type too 👇\n"
        "t.me/CareerCheck_Bot"
    ),

    "myresult_header":  "📋 <b>Your latest result</b>\n<i>Date: {date}</i>\n\n",
    "myresult_type":    "🎯 <b>Personality type: {label}</b>\n\n",
    "myresult_big5":    "📊 <b>Big Five profile:</b>\n",
    "myresult_top":     "🏆 <b>Top professions:</b>\n",
    "no_result":        "📭 No results yet. /start to take the test.",
    "not_registered":   "❌ You haven't taken the test yet. /start to begin.",

    "prof_why_fits":    "<b>📌 Why it suits YOU:</b>\n",
    "prof_compat":      "<b>📊 Trait compatibility:</b>\n",
    "prof_growth":      "📈 <b>Growth potential:</b> {growth}\n",
    "prof_reality":     "\n<b>⚡ Reality of the profession:</b>\n{reality}\n",
    "prof_pros":        "\n<b>✅ Pros:</b>\n",
    "prof_cons":        "\n<b>❌ Cons:</b>\n",

    "cancel_confirm": (
        "⚠️ <b>Test not finished!</b>\n\n"
        "You answered <b>{current} of 60</b> questions.\n"
        "Save progress to continue later?"
    ),
    "cancelled":        "❌ Cancelled. /start to begin.",
    "progress_saved": (
        "✅ <b>Progress saved!</b>\n\n"
        "Come back any time — you'll continue from the same question.\n"
        "Press /start — the bot will offer to resume."
    ),
    "progress_cleared": "❌ Test cancelled. /start to begin.",

    "about_text": (
        "<b>📚 HOW THE TEST WORKS</b>\n\n"
        "<b>Step 1:</b> 60 questions on a scale from «strongly disagree» to «strongly agree»\n"
        "<b>Step 2:</b> Algorithm calculates 5 personality traits (Big Five)\n"
        "<b>Step 3:</b> Mapping to 6 career types (RIASEC)\n"
        "<b>Step 4:</b> Matching against 30 real professions\n"
        "<b>Step 5:</b> Personalised breakdown with recommendations\n\n"
        "<b>🔬 Scientific basis:</b>\n"
        "• Big Five — the most validated personality model (thousands of studies)\n"
        "• RIASEC — John Holland's theory, 50+ years in career counselling\n\n"
        "<b>⚠️ Important:</b>\n"
        "• There are no right answers — be honest\n"
        "• The result is a starting point, not a verdict\n"
        "• Traits can change and be developed over time\n\n"
        "<i>Created by @Dimirdin</i>"
    ),

    "help_text": (
        "<b>📖 Commands:</b>\n"
        "/start — take the test\n"
        "/myresult — view your last result\n"
        "/help — help\n"
        "/cancel — cancel the test\n\n"
        "<b>About the test:</b>\n"
        "60 questions, 15 minutes, Big Five + RIASEC scientific model.\n"
        "30 professions with detailed analysis.\n\n"
        "Answer honestly — the algorithm will detect inconsistencies.\n\n"
        "<i>Created by @Dimirdin</i>"
    ),

    "about_creator": (
        "👨‍💻 <b>About this bot</b>\n\n"
        "CareerCheck was created by @Dimirdin.\n\n"
        "Stack: Python • aiogram 3 • PostgreSQL • ReportLab • matplotlib\n"
        "Model: Big Five + RIASEC (Holland's theory)\n\n"
        "Questions and suggestions: @Dimirdin"
    ),

    "err_generic":      "❌ Error. /cancel and /start",
    "err_no_questions": "❌ Questions not loaded.",
    "err_no_progress":  "❌ Progress not found or test completed. /start",
    "wait_processing":  "⏳ Wait a moment...",

    "riasec_R": (
        "🔧 <b>Realistic</b>\n\n"
        "You enjoy working with your hands, with tools, with nature. "
        "You care about tangible results — something you can see, touch, fix.\n\n"
        "<b>Your superpower:</b> making things that work. Not discussing, doing.\n"
        "<b>Your blind spot:</b> abstract debates, office politics, «visionary» talk.\n\n"
        "<b>Best environments:</b> workshops, kitchens, fields, roads, construction\n"
        "<b>Worst environments:</b> boardrooms, labs, open-space brainstorming sessions"
    ),
    "riasec_I": (
        "🔬 <b>Investigative</b>\n\n"
        "You need to understand how the world works. You ask questions others don't. "
        "Data, patterns, hypotheses — that's your language.\n\n"
        "<b>Your superpower:</b> seeing connections where others see chaos.\n"
        "<b>Your blind spot:</b> small details, routine, emotional drama.\n\n"
        "<b>Best environments:</b> labs, R&D, analytics, deep tech startups\n"
        "<b>Worst environments:</b> sales, customer support, template-based work"
    ),
    "riasec_A": (
        "🎨 <b>Artistic</b>\n\n"
        "You can't stand templates. Your value is uniqueness of perspective, style, approach. "
        "You create things that didn't exist before.\n\n"
        "<b>Your superpower:</b> seeing beauty and meaning where others see nothing.\n"
        "<b>Your blind spot:</b> deadlines, bureaucracy, «do it like everyone else».\n\n"
        "<b>Best environments:</b> studios, agencies, freelance, stage, galleries\n"
        "<b>Worst environments:</b> banks, rigid corporate structures, assembly lines"
    ),
    "riasec_S": (
        "🤝 <b>Social</b>\n\n"
        "You energise through people. Not just «liking people» — you understand them, "
        "feel them, help them grow. What matters is that the person next to you became better.\n\n"
        "<b>Your superpower:</b> building trust in minutes, not months.\n"
        "<b>Your blind spot:</b> unresolved conflicts, isolated work, numbers for numbers' sake.\n\n"
        "<b>Best environments:</b> schools, clinics, HR, coaching, social projects\n"
        "<b>Worst environments:</b> solo work, competitive teams, «everyone for themselves»"
    ),
    "riasec_E": (
        "💼 <b>Enterprising</b>\n\n"
        "You gain energy from persuasion, negotiation, influence. "
        "You're bored executing — you want to lead, create, take risks.\n\n"
        "<b>Your superpower:</b> seeing opportunities where others see problems.\n"
        "<b>Your blind spot:</b> details, routine, long-term planning without quick payoff.\n\n"
        "<b>Best environments:</b> startups, sales, politics, consulting, negotiations\n"
        "<b>Worst environments:</b> libraries, labs, solo work, strict hierarchy"
    ),
    "riasec_C": (
        "📋 <b>Conventional</b>\n\n"
        "You are the backbone. In a world of chaos you create order. "
        "You need clarity: who, what, when, how much. And that everything is correct.\n\n"
        "<b>Your superpower:</b> making complex things simple through systems and processes.\n"
        "<b>Your blind spot:</b> uncertainty, «figure it out yourself», constant change.\n\n"
        "<b>Best environments:</b> accounting, administration, audit, logistics, government\n"
        "<b>Worst environments:</b> process-less startups, creative chaos, «something new every day»"
    ),

    "pdf_subtitle":     "Personal Report",
    "pdf_subtitle2":    "Career Matches",
    "pdf_section_type": "PERSONALITY TYPE",
    "pdf_section_big5": "BIG FIVE PROFILE",
    "pdf_section_riasec":"RIASEC PROFILE",
    "pdf_section_growth":"GROWTH AREAS",
    "pdf_section_top3": "YOUR TOP-3 PROFESSIONS",
    "pdf_dom_label":    "Dominant personality type by RIASEC",
    "pdf_footer_center":"Your result is a starting point, not a verdict",
    "pdf_footer_left":  "CareerCheck  t.me/CareerCheck_Bot  @Dimirdin",
    "pdf_growth_tips": {
        "O": ("Openness",         "Read non-fiction, try a new hobby every month."),
        "C": ("Conscientiousness","Task tracker, time-blocking, the 2-minute rule."),
        "E": ("Extraversion",     "Public speaking, meetups, mentoring."),
        "A": ("Agreeableness",    "Active listening, volunteering, non-violent communication."),
        "S": ("Stability",        "Exercise, sleep schedule, meditation, reduce overload."),
    },
    "pdf_pros":         "Pros",
    "pdf_cons":         "Cons",
    "pdf_prospects":    "Growth potential",

    "card_your_type":   "YOUR PERSONALITY TYPE",
    "card_big5_title":  "Big Five",
    "card_riasec_title":"RIASEC",
    "card_profile":     "PERSONALITY PROFILE",
    "card_top_profs":   "TOP PROFESSIONS",
    "card_footer":      "Discover your career type  →  t.me/CareerCheck_Bot",
    "card_trait_names": ["Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Stability"],
    "card_riasec_names":["Realistic", "Investigative", "Artistic", "Social", "Enterprising", "Convent."],
    "card_riasec_labels":{
        "R": "REALISTIC", "I": "INVESTIGATIVE", "A": "ARTISTIC",
        "S": "SOCIAL", "E": "ENTERPRISING", "C": "CONVENTIONAL",
    },
}
