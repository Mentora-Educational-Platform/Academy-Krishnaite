// Universal Post & Content Translation System

const TranslationService = {
  // Active preference
  currentLanguage: "en",

  // Cache for translations to avoid rate limits: format {"text_en_targetLang": "translatedText"}
  cache: {},

  // Translation dictionary for UI text
  dictionary: {
    en: {
      dashboard: "Dashboard",
      communities: "Communities",
      krishnaite_free: "Krishnaite Free",
      karma_explorer: "Karma Explorer",
      krishtakarma_pro: "KrishtaKarma Pro",
      learning: "Learning",
      roadmaps: "Roadmaps",
      resources: "Resources",
      assets: "Assets",
      personal: "Personal",
      notifications: "Notifications",
      profile: "Profile",
      sign_out: "Sign Out",
      write_article: "Write Article",
      search_placeholder: "Search articles, roadmaps, resources...",
      welcome_back: "Welcome back,",
      announcements: "Announcements",
      pinned: "Pinned",
      recent_discussions: "Recent Discussions",
      no_articles: "No articles published yet",
      read_more: "Read more",
      min_read: "min read",
      comments: "Comments",
      like: "Like",
      reply: "Reply",
      bookmark: "Bookmark",
      share: "Share",
      settings: "Settings",
      preferred_lang: "Preferred Language",
      save_settings: "Save Settings",
      save_draft: "Save Draft",
      publish: "Publish",
      back_to_feed: "Back to Feed",
      translating: "Translating...",
      translate: "Translate",
      show_original: "Show Original",
      translated_automatically: "Translated Automatically",
      translation_failed: "Translation unavailable. Try again.",
      unlock_access: "Unlock Immediate Access",
      upgrade_title: "Upgrade to Access",
      upgrade_desc: "This community is locked for your current membership tier. Choose a plan to unlock immediate access to premium courses, expert roadmaps, and pro builder forums.",
      explorer_desc: "Perfect for developers looking to deepen their coding knowledge and build real-world projects.",
      pro_desc: "Ultimate membership tier. Complete access to all roadmaps, source files, and direct founder mentorship.",
      become_pro: "Become Pro Builder",
      unlock_explorer: "Unlock Explorer",
      pricing_title: "Flexible Tiers for Every Stage",
      pricing_subtitle: "Choose the membership that fits your learning pace and career goals.",
      about_founder: "About the Founder",

      // Landing static keys
      features: "Features",
      about: "About",
      sign_in: "Sign In",
      join_community: "Join Community",
      hero_badge_text: "A Dedicated Space for Software Engineering Excellence",
      hero_title: "A Calm, Minimalist Place <br>to Master Software Engineering",
      hero_subtitle: "Escape the noise. Consume long-form engineering guides from founders, track structured roadmaps, access boilerplates, and build your technical career without social-media distractions.",
      hero_action_enter: "Enter Academy",
      hero_action_tiers: "Explore Tiers",
      hero_trusted: "Trusted by modern builders worldwide",
      features_title: "Learn by Building, Guided by Experts",
      features_subtitle: "We focus entirely on deep engineering walkthroughs, high-quality resources, and interactive roadmaps.",
      feature1_title: "Founder Publications",
      feature1_desc: "Access detailed technical guides on compiler construction, systems architecture, and database tuning directly from the Acharya.",
      feature2_title: "Structured Roadmaps",
      feature2_desc: "Track your learning journey step-by-step from core foundations up to advanced backend architectures and cloud environments.",
      feature3_title: "Boilerplates & Guides",
      feature3_desc: "Download hot-reload boilerplates, cheatsheets, vector index templates, and configuration assets to save you hours of startup code.",
      feature4_title: "Thoughtful Discussion",
      feature4_desc: "Engage in threaded community comments built for clarity. Ask questions, seek code reviews, and discuss engineering principles calmly.",
      curriculum_title: "The Engineering Curriculum",
      curriculum_subtitle: "Interactive, checkpoint-driven learning roadmaps designed to take you from hobbyist to professional engineer.",
      curriculum_tag: "Core Curriculum",
      curriculum_preview_title: "Programming Foundations Roadmap",
      curriculum_checkpoints: "6 Checkpoints",
      curriculum_access_btn: "Register to Access All Roadmaps",
      step_vars: "Variables & Scopes",
      step_loops: "Control Loops",
      step_functions: "Functions Context",
      step_oop: "Object-Oriented",
      step_ds: "Data Structures",
      step_stack_heap: "Memory Heap/Stack",
      pricing_free_desc: "Get started with foundational guides, general announcements, and basic roadmap tracking.",
      pricing_explorer_desc: "Perfect for intermediate developers building dynamic web systems and writing parsers.",
      pricing_pro_desc: "For professionals seeking mastery in systems architecture, concurrency systems, and career scaling.",
      pricing_free_f1: "Access to Free Feed channel",
      pricing_free_f2: "Interactive programming roadmaps",
      pricing_free_f3: "Threaded comments in Free feed",
      pricing_free_f4: "Basic developer cheat sheets",
      pricing_explorer_f1: "Access to Explorer Community channel",
      pricing_explorer_f2: "Complete project boilerplate files",
      pricing_explorer_f3: "In-depth Markdown parser compiler tutorials",
      pricing_explorer_f4: "Standard member profile tag",
      pricing_pro_f1: "Access to Pro Portal & Live sessions",
      pricing_pro_f2: "Rust concurrency & Go Goroutine deep-dives",
      pricing_pro_f3: "Custom Vector Index templates",
      pricing_pro_f4: "Priority answers & code reviews",
      pricing_btn_free: "Get Started Free",
      pricing_btn_explorer: "Unlock Explorer",
      pricing_btn_pro: "Become Pro Builder",
      pricing_free_forever: "/forever",
      pricing_suffix_month: "/month",
      membership: "Membership",
      features: "Features",
      about: "About",
      sign_in: "Sign In",
      join_community: "Join Community",
      preferred_lang: "Preferred Language",
      save_settings: "Save Settings",
      pricing_free_forever: "/forever",
      pricing_suffix_month: "/month",
      membership: "Membership",
      recommended_badge: "RECOMMENDED",
      about_tag: "ABOUT THE FOUNDER",
      about_title: "Why I Built Krishnaite Academy",
      about_p1: "\"Modern social-media platforms and video portals are built to hijack attention. Infinite feeds, algorithmic triggers, and shallow soundbites are poisonous to real learning.\"",
      about_p2: "\"I built Krishnaite as a sanctuary for builders. A minimalist, distraction-free harbor where long-form technical guides are valued, where we study actual source code, and where engineering is treated with the focus, devotion, and calm it deserves.\"",
      about_signature_role: "Acharya / Founder",
      about_signature_sub: "Lead Systems Architect",
      footer_desc: "A calm, premium sanctuary for software builders.",
      footer_explore: "Explore",
      footer_curriculum: "Curriculum",
      footer_tiers: "Tiers",
      footer_about: "About Acharya",
      footer_privacy: "Privacy Policy",
      footer_terms: "Terms of Use",
      footer_copyright: "© 2026 Krishnaite Academy. All rights reserved. Built with devotion and Zen layout engineering.",
      auth_title_signin: "Sign In to Krishnaite",
      auth_subtitle_signin: "Enter your developer credentials to access the academy.",
      auth_title_signup: "Sign Up for Krishnaite",
      auth_subtitle_signup: "Create your free account and start learning.",
      auth_email: "Email Address",
      auth_password: "Password",
      auth_no_account: "Don\'t have an account?",
      auth_have_account: "Already have an account?",
      auth_btn_signin: "Sign In",
      auth_btn_signup: "Sign Up",
      creating_account: "Creating Account...",
      signing_in: "Signing In...",
      confirm_email_msg: "Sign up successful! Please check your email for the confirmation link, then Sign In.",
      creating_account: "Creating Account...",
      signing_in: "Signing In...",
      confirm_email_msg: "Sign up successful! Please check your email for the confirmation link, then Sign In."
    },
    te: {
      dashboard: "డ్యాష్‌బోర్డ్",
      communities: "కమ్యూనిటీలు",
      krishnaite_free: "Krishnaite Free",
      karma_explorer: "Karma Explorer",
      krishtakarma_pro: "KrishtaKarma Pro",
      learning: "అభ్యాసం",
      roadmaps: "రోడ్‌మ్యాప్‌లు",
      resources: "రిసోర్సెస్",
      assets: "అసెట్స్",
      personal: "వ్యక్తిగతం",
      notifications: "నోటిఫికేషన్లు",
      profile: "ప్రొఫైల్",
      sign_out: "సైన్ అవుట్",
      write_article: "ఆర్టికల్ రాయండి",
      search_placeholder: "ఆర్టికల్స్, రోడ్‌మ్యాప్స్, రిసోర్సెస్ శోధించండి...",
      welcome_back: "తిరిగి స్వాగతం,",
      announcements: "ప్రకటనలు",
      pinned: "పిన్ చేయబడింది",
      recent_discussions: "ఇటీవలి చర్చలు",
      no_articles: "ఇంకా ఎలాంటి ఆర్టికల్స్ ప్రచురించబడలేదు",
      read_more: "మరింత చదవండి",
      min_read: "నిమిషాల రీడ్",
      comments: "వ్యాఖ్యలు",
      like: "లైక్",
      reply: "రిప్లై",
      bookmark: "బుక్‌మార్క్",
      share: "షేర్",
      settings: "సెట్టింగ్స్",
      preferred_lang: "ప్రాధాన్యత భాష",
      save_settings: "సెట్టింగ్స్ సేవ్ చేయండి",
      save_draft: "డ్రాఫ్ట్ సేవ్ చేయండి",
      publish: "ప్రచురించు",
      back_to_feed: "ఫీడ్‌కి తిరిగి వెళ్ళండి",
      translating: "అనువదిస్తోంది...",
      translate: "అనువదించు",
      show_original: "అసలైనది చూపించు",
      translated_automatically: "ఆటోమేటిక్‌గా అనువదించబడింది",
      translation_failed: "అనువాదం అందుబాటులో లేదు. మళ్ళీ ప్రయత్నెంచండి.",
      unlock_access: "తక్షణ యాక్సెస్ అన్‌లాక్ చేయండి",
      upgrade_title: "యాక్సెస్ కోసం అప్‌గ్రేడ్ చేయండి",
      upgrade_desc: "ఈ కంటెంట్ మీ ప్రస్తుత సభ్యత్వ స్థాయికి లాక్ చేయబడింది. ప్రీమియం కోర్సులు, నిపుణుల రోడ్‌మ్యాప్‌లు మరియు ప్రో బిల్డర్ ఫోరమ్‌లకు తక్షణ యాక్సెస్‌ను అన్‌లాక్ చేయడానికి ఒక ప్లాన్‌ను ఎంచుకోండి.",
      explorer_desc: "కోడింగ్ పరిజ్ఞానాన్ని పెంపొందించుకోవడానికి మరియు నిజ-సమయ ప్రాజెక్ట్‌లను రూపొందించడానికి ఆసక్తి ఉన్న డెవలపర్‌ల కోసం సరైనది.",
      pro_desc: "అంతిమ సభ్యత్వ స్థాయి. అన్ని రోడ్‌మ్యాప్‌లు, సోర్స్ ఫైల్‌లు మరియు వ్యవస్థాపకుల ప్రత్యక్ష మార్గదర్శకత్వానికి పూర్తి యాక్సెస్.",
      become_pro: "Pro Builder అవ్వండి",
      unlock_explorer: "Explorer అన్‌లాక్ చేయండి",
      pricing_title: "ప్రతి దశకు సరిపోయే ప్లాన్లు",
      pricing_subtitle: "మీ అభ్యాస వేగం మరియు కెరీర్ లక్ష్యాలకు సరిపోయే సభ్యత్వాన్ని ఎంచుకోండి.",
      about_founder: "వ్యవస్థాపకుడి గురించి",

      // Landing static keys
      features: "ఫీచర్స్",
      about: "గురించి",
      sign_in: "సైన్ ఇన్",
      join_community: "కమ్యూనిటీలో చేరండి",
      hero_badge_text: "సాఫ్ట్‌వేర్ ఇంజనీరింగ్ నైపుణ్యం కోసం అంకితమైన వేదిక",
      hero_title: "సాఫ్ట్‌వేర్ ఇంజనీరింగ్‌ను నేర్చుకోవడానికి <br>ఒక ప్రశాంతమైన, అత్యుత్తమ స్థలం",
      hero_subtitle: "గజిబిజి వాతావరణం నుండి బయటపడండి. వ్యవస్థాపకుల నుండి లోతైన ఇంజనీరింగ్ గైడ్‌లను పొందండి, క్రమబద్ధమైన రోడ్‌మ్యాప్‌లను అనుసరించండి, బాయిలర్‌ప్లేట్‌లను యాక్సెస్ చేయండి మరియు సోషల్ మీడియా పరధ్యానం లేకుండా మీ సాంకేతిక కెరీర్‌ను నిర్మించుకోండి.",
      hero_action_enter: "అకాడమీలోకి ప్రవేశించండి",
      hero_action_tiers: "సభ్యత్వ శ్రేణులు",
      hero_trusted: "ప్రపంచవ్యాప్తంగా ఉన్న ఆధునిక బిల్డర్ల నమ్మకం",
      features_title: "నిపుణుల మార్గదర్శకత్వంతో, నిర్మిస్తూ నేర్చుకోండి",
      features_subtitle: "మేము పూర్తిగా లోతైన ఇంజనీరింగ్ గైడ్‌లు, అధిక-నాణ్యత వనరులు మరియు ఇంటరాక్టివ్ రోడ్‌మ్యాప్‌లపై దృష్టి పెడతాము.",
      feature1_title: "వ్యవస్థాపకుల ప్రచురణలు",
      feature1_desc: "కంపైలర్ నిర్మాణం, సిస్టమ్స్ ఆర్కిటెక్చర్ మరియు డేటాబేస్ ట్యూనింగ్ వంటి అంశాలపై లోతైన సాంకేతిక మార్గదర్శకాలను నేరుగా ఆచార్య నుండి యాక్సెస్ చేయండి.",
      feature2_title: "క్రమబద్ధమైన రోడ్‌మ్యాప్‌లు",
      feature2_desc: "సాధారణ ప్రాథమిక అంశాల నుండి అధునాతన బ్యాకెండ్ ఆర్కిటెక్చర్లు మరియు క్లౌడ్ వాతావరణాల వరకు మీ అభ్యాస ప్రయాణాన్ని దశలవారీగా ట్రాక్ చేయండి.",
      feature3_title: "బాయిలర్‌ప్లేట్లు & గైడ్స్",
      feature3_desc: "మీ ప్రాజెక్ట్ ప్రారంభ సమయాన్ని ఆదా చేయడానికి హాట్-రిలోడ్ బాయిలర్‌ప్లేట్లు, చీట్‌షీట్‌లు, వెక్టర్ ఇండెక్స్ టెంప్లేట్‌లు మరియు కాన్ఫిగరేషన్ ఆస్తులను డౌన్‌లోడ్ చేసుకోండి.",
      feature4_title: "ఆలోచనాత్మకమైన చర్చలు",
      feature4_desc: "స్పష్టత కోసం రూపొందించబడిన కమ్యూనిటీ కామెంట్లలో పాల్గొనండి. ప్రశ్నలు అడగండి, కోడ్ రివ్యూలను పొందండి మరియు ఇంజనీరింగ్ సూత్రాలను ప్రశాంతంగా చర్చించండి.",
      curriculum_title: "ఇంజనీరింగ్ పాఠ్యాంశాలు",
      curriculum_subtitle: "మిమ్మల్ని అభిరుచి గల స్థాయి నుండి ప్రొఫెషనల్ ఇంజనీర్‌గా మార్చడానికి రూపొందించిన ఇంటరాక్టివ్, చెక్‌పాయింట్-ఆధారిత అభ్యాస రోడ్‌మ్యాప్‌లు.",
      curriculum_tag: "ప్రధాన పాఠ్యాంశాలు",
      curriculum_preview_title: "ప్రోగ్రామింగ్ పునాదుల రోడ్‌మ్యాప్",
      curriculum_checkpoints: "6 చెక్‌పాయింట్లు",
      curriculum_access_btn: "అన్ని రోడ్‌మ్యాప్‌లను యాక్సెస్ చేయడానికి రిజిస్టర్ అవ్వండి",
      step_vars: "Variables & Scopes",
      step_loops: "Control Loops",
      step_functions: "Functions Context",
      step_oop: "Object-Oriented",
      step_ds: "Data Structures",
      step_stack_heap: "Memory Heap/Stack",
      pricing_free_desc: "Get started with foundational guides, general announcements, and basic roadmap tracking.",
      pricing_explorer_desc: "Perfect for intermediate developers building dynamic web systems and writing parsers.",
      pricing_pro_desc: "For professionals seeking mastery in systems architecture, concurrency systems, and career scaling.",
      pricing_free_f1: "Access to Free Feed channel",
      pricing_free_f2: "Interactive programming roadmaps",
      pricing_free_f3: "Threaded comments in Free feed",
      pricing_free_f4: "Basic developer cheat sheets",
      pricing_explorer_f1: "Access to Explorer Community channel",
      pricing_explorer_f2: "Complete project boilerplate files",
      pricing_explorer_f3: "In-depth Markdown parser compiler tutorials",
      pricing_explorer_f4: "Standard member profile tag",
      pricing_pro_f1: "Access to Pro Portal & Live sessions",
      pricing_pro_f2: "Rust concurrency & Go Goroutine deep-dives",
      pricing_pro_f3: "Custom Vector Index templates",
      pricing_pro_f4: "Priority answers & code reviews",
      pricing_btn_free: "ఉచితంగా ప్రారంభించండి",
      pricing_btn_explorer: "Explorer అన్‌లాక్ చేయండి",
      pricing_btn_pro: "Pro Builder అవ్వండి",
      pricing_free_forever: "/శాశ్వతంగా",
      pricing_suffix_month: "/నెల",
      membership: "సభ్యత్వం",
      features: "ఫీచర్స్",
      about: "గురించి",
      sign_in: "సైన్ ఇన్",
      join_community: "కమ్యూనిటీలో చేరండి",
      preferred_lang: "ప్రాధాన్యత భాష",
      save_settings: "సెట్టింగ్స్ సేవ్ చేయండి",
      pricing_free_forever: "/శాశ్వతంగా",
      pricing_suffix_month: "/నెల",
      membership: "సభ్యత్వం",
      recommended_badge: "సిఫార్సు చేయబడింది",
      about_tag: "వ్యవస్థాపకుడి గురించి",
      about_title: "నేను Krishnaite అకాడమీని ఎందుకు నిర్మించాను",
      about_p1: "\"ఆధునిక సోషల్ మీడియా ప్లాట్‌ఫారమ్‌లు మరియు వీడియో పోర్టల్‌లు మీ దృష్టిని మరల్చడానికి నిర్మించబడ్డాయి. అంతులేని ఫీడ్‌లు, అల్గారిథమిక్ ట్రిగ్గర్లు మరియు నిస్సారమైన సమాచారం నిజమైన అభ్యాసానికి హానికరం.\"",
      about_p2: "\"నేను బిల్డర్ల కోసం ఒక ప్రశాంతమైన ఆశ్రయంగా Krishnaiteని నిర్మించాను. దీర్ఘకాల సాంకేతిక గైడ్‌లు విలువైనవిగా ఉండే, మేము అసలు సోర్స్ కోడ్‌ను అధ్యయనం చేసే, మరియు ఇంజనీరింగ్ దానికి తగిన శ్రద్ధ, భక్తి మరియు ప్రశాంతతతో కూడిన వాతావరణంలో నేర్చుకునే ఒక పరధ్యానం లేని ప్రదేశం.\"",
      about_signature_role: "Acharya / Founder",
      about_signature_sub: "Lead Systems Architect",
      footer_desc: "సాఫ్ట్‌వేర్ బిల్డర్ల కోసం ఒక ప్రశాంతమైన, అత్యుత్తమ ఆశ్రయం.",
      footer_explore: "Explore",
      footer_curriculum: "Curriculum",
      footer_tiers: "Tiers",
      footer_about: "About Acharya",
      footer_privacy: "Privacy Policy",
      footer_terms: "Terms of Use",
      footer_copyright: "© 2026 Krishnaite అకాడమీ. సర్వ హక్కులూ ప్రత్యేకించబడినవి. భక్తి మరియు ప్రశాంతమైన లేఅవుట్ ఇంజనీరింగ్‌తో నిర్మించబడింది.",
      auth_title_signin: "Krishnaite కి సైన్ ఇన్ చేయండి",
      auth_subtitle_signin: "అకాడమీని యాక్సెస్ చేయడానికి మీ డెవలపర్ ఆధారాలను నమోదు చేయండి.",
      auth_title_signup: "Krishnaite లో రిజిస్టర్ అవ్వండి",
      auth_subtitle_signup: "మీ ఉచిత ఖాతాను సృష్టించండి మరియు నేర్చుకోవడం ప్రారంభించండి.",
      auth_email: "ఈమెయిల్ చిరునామా",
      auth_password: "పాస్‌వర్డ్",
      auth_no_account: "ఖాతా లేదా?",
      auth_have_account: "ఇప్పటికే ఖాతా ఉందా?",
      auth_btn_signin: "సైన్ ఇన్",
      auth_btn_signup: "సైన్ అప్",
      creating_account: "ఖాతా సృష్టించబడుతోంది...",
      signing_in: "సైన్ ఇన్ అవుతోంది...",
      confirm_email_msg: "రిజిస్ట్రేషన్ విజయవంతమైంది! దయచేసి ధృవీకరణ లింక్ కోసం మీ ఈమెయిల్‌ను తనిఖీ చేసి, ఆపై సైన్ ఇన్ చేయండి.",
      creating_account: "ఖాతా సృష్టించబడుతోంది...",
      signing_in: "సైన్ ఇన్ అవుతోంది...",
      confirm_email_msg: "రిజిస్ట్రేషన్ విజయవంతమైంది! దయచేసి ధృవీకరణ లింక్ కోసం మీ ఈమెయిల్‌ను తనిఖీ చేసి, ఆపై సైన్ ఇన్ చేయండి."
    }
  },

  // Set the global active language
  setLanguage: async function (langCode) {
    if (!this.dictionary[langCode]) langCode = "en";
    this.currentLanguage = langCode;
    localStorage.setItem("preferred_language", langCode);
    sessionStorage.setItem("language_selected", "true");
    
    // If user is logged in, attempt to sync to Supabase profile
    try {
      if (window.client) {
        const { data: { session } } = await window.client.auth.getSession();
        if (session) {
          await window.client
            .from("profiles")
            .update({ preferred_language: langCode })
            .eq("id", session.user.id);
        }
      }
    } catch (err) {
      console.warn("Could not sync preferred language to database profiles:", err);
    }

    // Refresh UI elements
    this.localizeUI();

    // Trigger custom event so the application knows the language updated
    document.dispatchEvent(new CustomEvent("languageChanged", { detail: langCode }));
  },

  // Translate all DOM elements with data-translate-key attributes
  localizeUI: function () {
    const lang = this.currentLanguage;
    const dict = this.dictionary[lang] || this.dictionary["en"];

    // Update all matching elements with data-translate-key attribute
    const elements = document.querySelectorAll("[data-translate-key]");
    elements.forEach(el => {
      const key = el.getAttribute("data-translate-key");
      if (dict[key]) {
        if (el.tagName === "INPUT" && el.hasAttribute("placeholder")) {
          el.setAttribute("placeholder", dict[key]);
        } else if (key === "hero_title") {
          el.innerHTML = dict[key];
        } else {
          el.textContent = dict[key];
        }
      }
    });

    // Update active language label in selectors
    const langNames = {
      en: "English",
      te: "తెలుగు",
      hi: "हिन्दी",
      ta: "தமிழ்",
      kn: "ಕನ್ನಡ",
      ml: "മലയാളം",
      mr: "मराठी",
      bn: "বাংলা",
      gu: "ગુજરાતી",
      pa: "ਪੰਜਾਬੀ"
    };
    document.querySelectorAll(".current-lang-name").forEach(el => {
      el.textContent = langNames[lang] || "English";
    });

    // Update global search input placeholder dynamically
    const globalSearch = document.getElementById("global-search");
    if (globalSearch && dict.search_placeholder) {
      globalSearch.setAttribute("placeholder", dict.search_placeholder);
    }

    // Run DOM scanner to localize remaining untranslated content
    this.scanAndTranslateDOM().catch(err => console.error("DOM scanner error:", err));
  },

  // Scan DOM recursively for untranslated English strings and translate them dynamically
  scanAndTranslateDOM: async function() {
    const targetLang = this.currentLanguage;
    if (targetLang === "en") return;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tagName = parent.tagName.toLowerCase();
          
          // Skip interactive, meta, and code elements
          if (["script", "style", "pre", "code", "svg", "path"].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Skip elements that are already localized, dropdown selectors, or have no-translate class
          if (parent.hasAttribute("data-translate-key") || parent.closest("[data-translate-key]") || parent.closest(".lang-dropdown") || parent.closest(".no-translate") || parent.classList.contains("no-translate")) {
            return NodeFilter.FILTER_REJECT;
          }

          const text = node.nodeValue.trim();
          // Must contain English words to translate
          if (!/[a-zA-Z]{2,}/.test(text)) {
            return NodeFilter.FILTER_REJECT;
          }

          // Protect brand names
          const protectedBrands = [
            "krishnaite", "krishnaite free", "krishtakarma", "krishtakarma pro", "karma explorer",
            "honeygpt", "mentozy", "harshita", "acharya", "notion", "linear", "apple style",
            "github", "google", "facebook", "twitter", "razorpay"
          ];
          const lowerText = text.toLowerCase();
          if (protectedBrands.some(brand => lowerText.includes(brand))) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodesToTranslate = [];
    let currentNode;
    while (currentNode = walker.nextNode()) {
      nodesToTranslate.push(currentNode);
    }

    for (let node of nodesToTranslate) {
      const originalText = node.nodeValue.trim();
      try {
        const translated = await this.translateContent(originalText, targetLang);
        node.nodeValue = node.nodeValue.replace(originalText, translated);
      } catch (err) {
        console.warn("DOM Scanner failed to translate:", originalText, err);
      }
    }
  },

  // Perform translation of dynamic user content using MyMemory Translation API
  translateContent: async function (text, targetLang) {
    if (!text || text.trim() === "") return text;
    if (targetLang === "en" || !targetLang) return text; // Default base language is English

    const cacheKey = `${text}_en_${targetLang}`;
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    try {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`
      );
      const data = await response.json();
      if (data && data.responseData && data.responseData.translatedText) {
        const result = data.responseData.translatedText;
        this.cache[cacheKey] = result;
        return result;
      }
      return text;
    } catch (err) {
      console.warn("Translation API failed for text:", text, err);
      return text;
    }
  },

  // Helper to determine if we should offer translation for content
  shouldShowTranslate: function (text, lang) {
    if (!text || text.trim() === "") return false;
    if (lang === "en" || !lang) return false;
    return true;
  }
};


// HTML body translator that ignores pre/code blocks
window.translateHTMLBody = async function (html, targetLang) {
  if (!html) return "";
  const parts = html.split(/(<pre[\s\S]*?<\/pre>)/gi);
  const translatedParts = await Promise.all(parts.map(async (part) => {
    if (part.toLowerCase().startsWith("<pre")) {
      return part;
    }
    return await TranslationService.translateContent(part, targetLang);
  }));
  return translatedParts.join("");
};

// Global toggle handler for translation triggers
window.toggleTranslatePost = async function (postId, btn, event) {
  if (event) event.stopPropagation();
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;

  const card = document.getElementById(postId) || document.querySelector(`.reading-article-container`);
  if (!card) return;

  const actionsBar = card.querySelector(".post-actions-bar");
  if (!actionsBar) return;

  const isTranslated = btn.getAttribute("data-translated") === "true";

  if (isTranslated) {
    const translationContainer = card.querySelector(".post-translation-container");
    if (translationContainer) translationContainer.remove();

    btn.setAttribute("data-translated", "false");
    btn.innerHTML = `<i data-lucide="globe" style="width: 16px; height: 16px;"></i> <span>Translate</span>`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width: 16px; height: 16px; margin-right: 4px; display: inline-block; vertical-align: middle;"></i> <span>Translating...</span>`;
  if (window.lucide) window.lucide.createIcons();

  try {
    const targetLang = TranslationService.currentLanguage === "en" ? "te" : TranslationService.currentLanguage;
    const langNames = {
      en: "English",
      te: "Telugu",
      hi: "Hindi",
      ta: "Tamil",
      kn: "Kannada",
      ml: "Malayalam",
      mr: "Marathi",
      bn: "Bengali",
      gu: "Gujarati",
      pa: "Punjabi"
    };
    const targetLangName = langNames[targetLang] || "Telugu";

    const [translatedTitle, translatedBody] = await Promise.all([
      TranslationService.translateContent(post.title, targetLang),
      translateHTMLBody(post.body, targetLang)
    ]);

    if (translatedTitle === post.title && translatedBody === post.body) {
      throw new Error("Translation unavailable.");
    }

    const translationHTML = `
      <div class="post-translation-container" style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--border); margin-bottom: 16px;">
        <div style="font-size: 12px; color: var(--primary); font-weight: 700; display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
          <i data-lucide="globe" style="width: 14px; height: 14px;"></i> Translated (${targetLangName})
        </div>
        <h3 class="translated-title" style="font-size: 16px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">${translatedTitle}</h3>
        <div class="translated-body" style="font-size: 14px; color: var(--text-secondary); line-height: 1.65;">${translatedBody}</div>
      </div>
    `;

    // Remove any pre-existing translation container just in case
    const oldContainer = card.querySelector(".post-translation-container");
    if (oldContainer) oldContainer.remove();

    actionsBar.insertAdjacentHTML("beforebegin", translationHTML);

    btn.setAttribute("data-translated", "true");
    btn.innerHTML = `<i data-lucide="rotate-ccw" style="width: 16px; height: 16px;"></i> <span>Show Original</span>`;
  } catch (err) {
    console.error(err);
    alert("Translation unavailable.");
    btn.innerHTML = `<i data-lucide="globe" style="width: 16px; height: 16px;"></i> <span>Translate</span>`;
  } finally {
    btn.disabled = false;
    if (window.lucide) window.lucide.createIcons();
  }
};

window.selectLang = function (langCode) {
  TranslationService.setLanguage(langCode);
};

// Global toggle handler for comment & reply translation triggers
window.toggleTranslateComment = async function(postId, commentId, replyId, btn) {
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;

  const comment = post.comments.find(c => c.id === commentId);
  if (!comment) return;

  let textEl, originalText;
  if (replyId) {
    const reply = comment.replies.find(r => r.id === replyId);
    if (!reply) return;
    originalText = reply.text;
    const replyBtn = document.querySelector(`[onclick*="${replyId}"]`);
    if (replyBtn) {
      const commentCard = replyBtn.closest(".comment-card");
      if (commentCard) textEl = commentCard.querySelector(".comment-text");
    }
  } else {
    originalText = comment.text;
    const commentBtn = document.querySelector(`[onclick*="${commentId}"]`);
    if (commentBtn) {
      const commentCard = commentBtn.closest(".comment-card");
      if (commentCard) textEl = commentCard.querySelector(".comment-text");
    }
  }

  if (!textEl) return;

  const isTranslated = btn.getAttribute("data-translated") === "true";

  if (isTranslated) {
    textEl.innerHTML = originalText;
    const badge = textEl.parentElement.querySelector(".translation-badge");
    if (badge) badge.remove();
    btn.setAttribute("data-translated", "false");
    btn.textContent = "Translate";
    return;
  }

  btn.style.pointerEvents = "none";
  btn.textContent = "Translating...";

  try {
    const targetLang = TranslationService.currentLanguage;
    const translatedText = await TranslationService.translateContent(originalText, targetLang);
    textEl.innerHTML = translatedText;

    const badgeHTML = `<div class="translation-badge" style="font-size: 10px; color: var(--primary); font-weight: 500; margin-top: 4px;">Translated Automatically</div>`;
    textEl.insertAdjacentHTML("afterend", badgeHTML);

    btn.setAttribute("data-translated", "true");
    btn.textContent = "Show Original";
  } catch (err) {
    btn.textContent = "Translate";
  } finally {
    btn.style.pointerEvents = "auto";
  }
};

// Global toggle handler for roadmap translation
window.toggleTranslateRoadmap = async function(roadmapId, btn) {
  const roadmap = state.roadmaps.find(rm => rm.id === roadmapId);
  if (!roadmap) return;

  const card = document.querySelector(`[data-roadmap-id="${roadmapId}"]`);
  if (!card) return;

  const titleEl = card.querySelector(".section-card-title");
  const topicSpans = card.querySelectorAll(".topic-check-item span");
  const nextStepEl = card.querySelector(".roadmap-next-suggestion");

  const isTranslated = btn.getAttribute("data-translated") === "true";

  if (isTranslated) {
    if (titleEl) titleEl.textContent = roadmap.title;
    topicSpans.forEach((span, idx) => {
      if (roadmap.topics[idx]) span.textContent = roadmap.topics[idx].name;
    });
    if (nextStepEl && roadmap.nextRoadmap !== 'None (Keep building!)') {
      nextStepEl.innerHTML = `Recommended Next Step: <span class="next-roadmap-link" onclick="scrollToRoadmap('${roadmap.nextRoadmap}')">${roadmap.nextRoadmap} <i data-lucide="arrow-right" style="width: 12px; height: 12px; display: inline; vertical-align: middle;"></i></span>`;
    }
    const badge = card.querySelector(".translation-badge");
    if (badge) badge.remove();
    btn.setAttribute("data-translated", "false");
    btn.innerHTML = `<i data-lucide="globe" style="width: 12px; height: 12px;"></i> Translate`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  btn.style.pointerEvents = "none";
  btn.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width: 12px; height: 12px;"></i> Translating...`;
  if (window.lucide) window.lucide.createIcons();

  try {
    const targetLang = TranslationService.currentLanguage;
    const [translatedTitle, translatedNext] = await Promise.all([
      TranslationService.translateContent(roadmap.title, targetLang),
      roadmap.nextRoadmap !== 'None (Keep building!)' ? TranslationService.translateContent("Recommended Next Step:", targetLang) : Promise.resolve("")
    ]);

    const translatedTopics = await Promise.all(roadmap.topics.map(t => TranslationService.translateContent(t.name, targetLang)));

    if (titleEl) titleEl.textContent = translatedTitle;
    topicSpans.forEach((span, idx) => {
      if (translatedTopics[idx]) span.textContent = translatedTopics[idx];
    });

    if (nextStepEl && roadmap.nextRoadmap !== 'None (Keep building!)') {
      nextStepEl.innerHTML = `${translatedNext} <span class="next-roadmap-link" onclick="scrollToRoadmap('${roadmap.nextRoadmap}')">${roadmap.nextRoadmap} <i data-lucide="arrow-right" style="width: 12px; height: 12px; display: inline; vertical-align: middle;"></i></span>`;
    }

    const badgeHTML = `<div class="translation-badge" style="font-size: 10px; color: var(--primary); font-weight: 500; margin-top: 4px; display: inline-block;"><i data-lucide="check" style="width: 10px; height: 10px; display: inline; vertical-align: middle;"></i> Translated Automatically</div>`;
    titleEl.insertAdjacentHTML("afterend", badgeHTML);

    btn.setAttribute("data-translated", "true");
    btn.innerHTML = `<i data-lucide="rotate-ccw" style="width: 12px; height: 12px;"></i> Show Original`;
  } catch (err) {
    btn.innerHTML = `<i data-lucide="globe" style="width: 12px; height: 12px;"></i> Translate`;
  } finally {
    btn.style.pointerEvents = "auto";
    if (window.lucide) window.lucide.createIcons();
  }
};

// Global toggle handler for resource translation
window.toggleTranslateResource = async function(resourceId, btn) {
  const resObj = state.resources.find(r => r.id === resourceId);
  if (!resObj) return;

  const card = btn.closest(".resource-card");
  if (!card) return;

  const titleEl = card.querySelector(".resource-title-text");
  const descEl = card.querySelector(".resource-desc");

  const isTranslated = btn.getAttribute("data-translated") === "true";

  if (isTranslated) {
    if (titleEl) titleEl.textContent = resObj.title;
    if (descEl) descEl.textContent = resObj.desc;
    const badge = card.querySelector(".translation-badge");
    if (badge) badge.remove();
    btn.setAttribute("data-translated", "false");
    btn.innerHTML = `<i data-lucide="globe" style="width: 12px; height: 12px;"></i> Translate`;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  btn.style.pointerEvents = "none";
  btn.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width: 12px; height: 12px;"></i> Translating...`;
  if (window.lucide) window.lucide.createIcons();

  try {
    const targetLang = TranslationService.currentLanguage;
    const [translatedTitle, translatedDesc] = await Promise.all([
      TranslationService.translateContent(resObj.title, targetLang),
      TranslationService.translateContent(resObj.desc, targetLang)
    ]);

    if (titleEl) titleEl.textContent = translatedTitle;
    if (descEl) descEl.textContent = translatedDesc;

    const badgeHTML = `<div class="translation-badge" style="font-size: 10px; color: var(--primary); font-weight: 500; margin-top: 4px; display: inline-block;"><i data-lucide="check" style="width: 10px; height: 10px; display: inline; vertical-align: middle;"></i> Translated Automatically</div>`;
    titleEl.insertAdjacentHTML("afterend", badgeHTML);

    btn.setAttribute("data-translated", "true");
    btn.innerHTML = `<i data-lucide="rotate-ccw" style="width: 12px; height: 12px;"></i> Show Original`;
  } catch (err) {
    btn.innerHTML = `<i data-lucide="globe" style="width: 12px; height: 12px;"></i> Translate`;
  } finally {
    btn.style.pointerEvents = "auto";
    if (window.lucide) window.lucide.createIcons();
  }
};

window.TranslationService = TranslationService;
