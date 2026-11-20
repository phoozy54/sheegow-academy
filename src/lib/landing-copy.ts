export type LandingSection = {
  heading: string;
  body: string;
  bullets: string[];
};

export type LandingConfig = {
  slug: string;
  path: string;
  eyebrow: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  lead: string;
  sections: LandingSection[];
  faqs: Array<{ question: string; answer: string }>;
  /** Which course levels to feature on this page. */
  levels: string[];
};

export const LANDING_PAGES: Record<string, LandingConfig> = {
  "barashada-ingiriisiga-online": {
    slug: "barashada-ingiriisiga-online",
    path: "/barashada-ingiriisiga-online",
    eyebrow: "Barashada Ingiriisiga online",
    title: "Barashada Ingiriisiga online — fasallo live ah",
    metaTitle: "Barashada Ingiriisiga Online — Live Classes",
    metaDescription:
      "Baro Ingiriisiga online fasallo live ah oo lala wadaago macallin dhab ah. Ku bilow Hargeisa ama meel kasta — koorso Somali u gaar ah.",
    lead: "Barashada Ingiriisiga online waxay noqon kartaa mid dhab ah markaad si toos ah ula hadasho macallin. SHEEGOW ACADEMY waxay bixisaa fasallo video ah oo is dhexgal ah — ma aha muuqaallo horay loo duubay.",
    sections: [
      {
        heading: "Maxaad ku baran doontaa?",
        body: "Koorso kasta wuxuu ku dhisan yahay casharro live ah, layli hadal, iyo jawaab celin aad ka hesho macallinka isla markiiba.",
        bullets: [
          "Ku hadal Ingiriisi bilowgii hore, adigoo aan ka baqayn inaad qalad sameyso",
          "Baro erayo iyo tibaaxo nolol maalmeedka ah oo Somali ah",
          "Ku celceli dhageysiga, akhriska, qorista iyo hadalka fasal kasta",
          "Hel jawaab celin shaqsiyeed iyo qiimeyn cad oo horumarkaaga ah",
        ],
      },
      {
        heading: "Sidee ayay u shaqeysaa?",
        body: "Samee akoon arday ah oo bilaash ah, dooro koorsada kugu habboon, ka dibna ku biir fasalka live-ka ah. Waxaad aragtaa macallinka, maqashaa codkiisa, chat ayaadna ku weydiin kartaa su’aal ama gacan ayaad qaadi kartaa.",
        bullets: [
          "Ku biir Hargeisa ama meel kasta oo adduunka ah",
          "Fasallada waa kuwo yaryar oo is dhexgal ah",
          "Lacagtu waa card, Zaad ama Edahab — tijaabo bilaash ah waxaa ansixin kara maamulka kaliya",
          "Shahaado waxaa la bixiyaa marka casharrada, imtixaannada iyo shaqada guriga la dhammaystiro",
        ],
      },
    ],
    faqs: [
      {
        question: "Ma bilaash baa barashada Ingiriisiga online?",
        answer: "Akoonka ardayda iyo tijaabada fasalka waa bilaash marka maamulku ansixiyo. Koorsooyinka buuxa waa lacag, waxaana lagu bixiyaa card, Zaad ama Edahab.",
      },
      {
        question: "Ma waxaa jira muuqaallo duuban?",
        answer: "Maya. Dhammaan fasallada SHEEGOW ACADEMY waa live. Ma bixino duubis ama replay, marka waxaad u baahan tahay inaad waqtiga fasalka joogto.",
      },
      {
        question: "Yaa wax dhiga?",
        answer: "Ciise Mohamed Sheeq (SHEEGOW), macallin Ingiriisi ah oo London ku wax ku bartay, 15 sano oo khibrad wax dhigis ah leh, ayaa ah macallinka dhabta ah ee koorsooyinka.",
      },
      {
        question: "Ma ka biirsan karaa Hargeisa?",
        answer: "Haa. Waxaan ku sugannahay Hargeisa, Somaliland, fasalladana waa online, marka waad ka biirsan kartaa Hargeisa iyo meel kasta oo internet fiican leh.",
      },
    ],
    levels: ["Beginner", "Intermediate", "Advanced"],
  },

  "koorso-ingiriisi-hargeisa": {
    slug: "koorso-ingiriisi-hargeisa",
    path: "/koorso-ingiriisi-hargeisa",
    eyebrow: "Koorsada Ingiriisiga Hargeisa",
    title: "Koorsada Ingiriisiga Hargeisa — live online",
    metaTitle: "Koorsada Ingiriisiga Hargeisa | Live Online",
    metaDescription:
      "Koorsada Ingiriisiga Hargeisa ee live online: bilow, IELTS iyo business English. Macallin Ciise, fasallo is dhexgal ah, ma aha duubis.",
    lead: "Haddii aad Hargeisa ku raadineyso koorso Ingiriisi ah oo runtii lagu hadlo, halkan kuma helaysid muuqaal duuban — waxaad helaysaa fasal toos ah oo aad macallinka la hadasho.",
    sections: [
      {
        heading: "Koorsooyin ku habboon Hargeisa",
        body: "Laga bilaabo xarfaha iyo salaanta ilaa IELTS iyo shaqo, waxaa jira waddo cad oo aad ku socoto. Koorso kasta wuxuu leeyahay casharro, layli iyo imtixaan la dhammaystiro.",
        bullets: [
          "English Conversation for Beginners — bilowayaasha",
          "Intermediate English Mastery — hadal iyo grammar",
          "IELTS Preparation — Somaliland iyo Hargeisa",
          "Business English — shaqo, shirar iyo email",
        ],
      },
      {
        heading: "Maxaa ka duwan?",
        body: "Macallin dhab ah ayaa ku arka, ku maqla, oo kuu sharxaya markaad qalad sameyso. Ardayda kale ayay ku hadlaan, chat-bana way u furan yahay su’aalaha.",
        bullets: [
          "Fasal live ah oo Hargeisa laga geli karo",
          "Macallin Ciise — 15 sano oo khibrad ah",
          "Qiimeyn cad iyo shahaado marka shuruudaha la buuxiyo",
          "Lacag bixin maxalli ah: Zaad, Edahab ama card",
        ],
      },
    ],
    faqs: [
      {
        question: "Koorsada Ingiriisiga Hargeisa ma online baa mise waji ka waji?",
        answer: "Fasallada waa online live video, waxaana laga geli karaa Hargeisa. Ma bixino duubis; waxaad si toos ah ula hadashaa macallinka iyo ardayda kale.",
      },
      {
        question: "Waa kuwee koorsooyiga ugu horreeya?",
        answer: "Bilowayaasha waxaan kula talinaynaa English Conversation for Beginners. Haddii aad hore u garanayso aasaaska, qaado Intermediate Mastery; haddii aad u baahan tahay IELTS, qaado IELTS Preparation.",
      },
      {
        question: "Sideen ku bixiyaa?",
        answer: "Waxaa la bixin karaa card, Zaad ama Edahab. Koorso lacag leh waxay u baahan tahay enrolment iyo bixin la dhammaystiro; tijaabo bilaash ah waxaa go’aamin kara maamulka.",
      },
      {
        question: "Halkee ku sugan tahay academy-ku?",
        answer: "SHEEGOW ACADEMY waxay ku sugan tahay Hargeisa, Somaliland. Email: info@sheegowacademy.com, telefoon/WhatsApp: +252 63 4085151.",
      },
    ],
    levels: ["Beginner", "IELTS", "Advanced", "Business"],
  },

  "ielts-somali": {
    slug: "ielts-somali",
    path: "/ielts-somali",
    eyebrow: "IELTS Somaliland",
    title: "IELTS Somaliland — diyaarin live ah",
    metaTitle: "IELTS Somaliland — Live Preparation Course",
    metaDescription:
      "U diyaar garow IELTS ee Somaliland adigoo wata tababar live ah: Listening, Reading, Writing, Speaking, mock tests iyo jawaab celin shaqsiyeed.",
    lead: "IELTS Somaliland waa tartan, waxaadna u baahan tahay jawaab celin dhab ah — ma aha muuqaal aad daawato. Koorsooyinkayaga IELTS waa fasallo live ah oo dhammaan afarta qaybood daboola.",
    sections: [
      {
        heading: "Afarta qaybood ee IELTS",
        body: "Cashar kasta wuxuu leeyahay tababar iyo jawaab celin. Macallinku wuxuu dhageysanayaa hadalkaaga, akhrinayaa qoraalkaaga, wuxuuna kuu sharxayaa sida score-ka loo kordhiyo.",
        bullets: [
          "Listening — dhageysiga iyo fahamka codadka imtixaanka",
          "Reading — akhris degdeg ah iyo faham qoto dheer",
          "Writing — Task 1 iyo Task 2 oo la saxo",
          "Speaking — Part 1, 2 iyo 3 oo toos ah loo tababaro",
        ],
      },
      {
        heading: "Maxaa kuu diyaarinaya?",
        body: "Waxaa jira mock tests, layli waqtiyeysan iyo jawaab celin shaqsiyeed oo kala saarta meesha aad ku fiican tahay iyo meesha aad ku kordhin karto.",
        bullets: [
          "Mock tests iyo falanqayn natiijo",
          "Jawaab celin shaqsiyeed oo qoraal iyo hadal ah",
          "Tababar waqtiyeysan oo imtixaanka u eg",
          "Ku biirista Hargeisa ama meel kasta oo Somaliland ah",
        ],
      },
    ],
    faqs: [
      {
        question: "Ma u diyaarin kartaa IELTS Somaliland?",
        answer: "Haa. Koorsooyinkayaga IELTS waa online live, waxaana laga geli karaa Hargeisa, Muqdisho, Garoowe ama meel kasta oo Somaliland iyo Soomaaliya ah.",
      },
      {
        question: "Ma jiraan mock tests?",
        answer: "Haa. Waxaa jira imtixaano tababar ah iyo jawaab celin macallinka oo ku saabsan afarta qaybood ee IELTS.",
      },
      {
        question: "Ma bixisaa duubis cashar ah?",
        answer: "Maya. Dhammaan casharrada IELTS waa live. Ma bixino recording ama replay, marka waa inaad joogtaa waqtiga fasalka.",
      },
      {
        question: "Immisa ayay ku kacaysaa?",
        answer: "Koorsada IELTS Preparation waa $79 waxaana lagu bixiyaa card, Zaad ama Edahab. Tijaabo bilaash ah waxaa ansixin kara maamulka kaliya.",
      },
    ],
    levels: ["IELTS"],
  },

  "english-classes-for-somalis": {
    slug: "english-classes-for-somalis",
    path: "/english-classes-for-somalis",
    eyebrow: "English classes for Somalis",
    title: "English classes for Somalis — live online",
    metaTitle: "English Classes for Somalis — Live Online",
    metaDescription:
      "Live English classes for Somalis in Hargeisa and worldwide. Speak every lesson with a real teacher, practise speaking, and build confidence fast.",
    lead: "Our English classes for Somalis are built around one simple idea: you must speak to learn. Every session is a live video class where your teacher sees you, hears you and corrects you in real time.",
    sections: [
      {
        heading: "Made for Somali speakers",
        body: "Explanations connect English to the Somali words and situations you already know. That makes grammar and vocabulary clearer, and it helps you speak without translating every sentence in your head.",
        bullets: [
          "Beginner, intermediate, advanced, IELTS, business and kids courses",
          "Live video with chat and raise-hand — not pre-recorded videos",
          "Teacher Ciise, a London-educated English expert with 15 years of teaching",
          "Learn from Hargeisa or from anywhere in the Somali diaspora",
        ],
      },
      {
        heading: "What a live class looks like",
        body: "You join the classroom in your browser. The teacher explains the topic, you practise out loud, and classmates answer and ask questions too. Homework and quizzes show what you still need to review.",
        bullets: [
          "Small, interactive online groups",
          "Real-time feedback on speaking and writing",
          "Clear progress tracking through lessons and quizzes",
          "Certificate after all lessons, quizzes and homework are completed",
        ],
      },
    ],
    faqs: [
      {
        question: "Are these recorded classes?",
        answer: "No. SHEEGOW ACADEMY only offers live interactive classes. There are no recordings or replays — you join the teacher and other students in real time.",
      },
      {
        question: "Can I join from outside Somaliland?",
        answer: "Yes. Students join live online from Hargeisa, across Somaliland and from the diaspora. All you need is a stable internet connection and a device with a camera and microphone.",
      },
      {
        question: "How much do the courses cost?",
        answer: "Courses range from $29 to $79 depending on level and length. You can pay by card, Zaad or Edahab. A free trial is available only when an administrator approves it.",
      },
      {
        question: "Who is the teacher?",
        answer: "Ciise Mohamed Sheeq (SHEEGOW) is the academy's real and sole teacher. He is a London-educated English expert with 15 years of teaching experience.",
      },
    ],
    levels: ["Beginner", "Intermediate", "Advanced", "IELTS", "Kids"],
  },

  "ingiriis-ku-hadal": {
    slug: "ingiriis-ku-hadal",
    path: "/ingiriis-ku-hadal",
    eyebrow: "Ingiriis ku hadal",
    title: "Ingiriis ku hadal — kalsooni live ah",
    metaTitle: "Ingiriis Ku Hadal — Live Speaking Classes",
    metaDescription:
      "Ingiriis ku hadal oo kalsooni leh: fasallo live ah oo aad ku hadasho macallin iyo ardayda kale. Ku bilow Hargeisa ama online.",
    lead: "Haddii aad fahanto Ingiriisiga laakiin aad ka baqayso inaad hadasho, waxaad u baahan tahay fasallo lagu hadlo — ma aha ku la daawado. Halkan waxaad ku hadashaa bilow ilaa dhammaad.",
    sections: [
      {
        heading: "Hadalka ayaa saldhig u ah",
        body: "Cashar kasta wuxuu leeyahay qayb gaar ah oo hadal ah: salaan, is-barasho, su’aalo, sheeko gaaban iyo dood. Macallinku wuxuu ku dhageysanayaa si toos ah wuxuuna kuu saxayaa ku dhawaaqida iyo naxwaha.",
        bullets: [
          "Ku hadal macallinka iyo ardayda kale fasal kasta",
          "Ku celceli xaaladaha dhabta ah: dukaan, safar, shaqo iyo imtixaan",
          "Baro tibaaxo Ingiriisi ah oo dabiici ah",
          "Hel jawaab celin degdeg ah oo kalsoonida ku dhisaysa",
        ],
      },
      {
        heading: "Laga bilaabo Hargeisa ilaa adduunka",
        body: "Waxaan joognaa Hargeisa, Somaliland, laakiin fasallada waa online. Waxaad ka hadli kartaa gurigaaga, adigoo isticmaalaya telefoon ama kombiyuutar.",
        bullets: [
          "Fasallo yaryar oo is dhexgal ah",
          "Chat iyo gacan-qaad live ah oo su’aalaha loo geliyo",
          "Lacag bixin Zaad, Edahab ama card",
          "Tijaabo waxaa ansixin kara maamulka oo keliya",
        ],
      },
    ],
    faqs: [
      {
        question: "Ma ku hadli karaa Ingiriisi haddii aan waxba aqaan?",
        answer: "Haa. Koorsooyinka bilowga ah waxay ka bilaabmaan salaan iyo is-barasho. Macallinku wuxuu kugu hagayaa talaabo yar-yar, qaladkana waa qayb ka mid ah barashada.",
      },
      {
        question: "Ma la duubaa casharrada hadalka?",
        answer: "Maya. Ma bixino duubis. Fasal kasta waa live, marka waa inaad joogtaa waqtiga si aad u hadasho.",
      },
      {
        question: "Immisa arday ayaa fasal ku jira?",
        answer: "Fasallada waa kuwo yaryar si qof walba u helo waqti uu ku hadlo. Waxaad isticmaali kartaa chat iyo raise-hand markaad su’aal qabto.",
      },
      {
        question: "Sideen ku bilaabayaa?",
        answer: "Samee akoon arday ah oo bilaash ah, dooro koorso, ku biir fasalka live-ka ah. Haddii aad rabto tijaabo, maamulka ayaa ansixin kara ka hor intaadan fasalka gelin.",
      },
    ],
    levels: ["Beginner", "Intermediate", "Advanced"],
  },

  "english-beginners": {
    slug: "english-beginners",
    path: "/english-beginners",
    eyebrow: "English for beginners",
    title: "English for beginners — live online course",
    metaTitle: "English for Beginners — Live Online Course",
    metaDescription:
      "Start English from zero with live online classes for Somali beginners. Greetings, travel and daily conversation with teacher Ciise.",
    lead: "Never studied English before? Start here. This beginner course gives you the words, the confidence and the live practice to speak from your very first class.",
    sections: [
      {
        heading: "From zero to your first conversation",
        body: "We start with the basics — greetings, introductions and simple sentences — then build towards real situations like shopping, asking for directions and talking about your day.",
        bullets: [
          "Greetings and introducing yourself in English",
          "Numbers, time, shopping and travel phrases",
          "Simple present and everyday sentence patterns",
          "Pronunciation practice with a real teacher",
        ],
      },
      {
        heading: "Why live classes help beginners",
        body: "A beginner needs correction and encouragement immediately. In a live class your teacher hears you, fixes mistakes gently, and repeats until the sentence feels natural.",
        bullets: [
          "Live video with chat and raise-hand for questions",
          "Somali explanations when a concept is difficult",
          "Short homework and quizzes to lock in each lesson",
          "Certificate after lessons, quizzes and homework are complete",
        ],
      },
    ],
    faqs: [
      {
        question: "I have never learned English. Can I join?",
        answer: "Yes. English Conversation for Beginners is designed for absolute beginners. The teacher starts from greetings and simple sentences, and explains difficult points in Somali.",
      },
      {
        question: "Are the lessons recorded?",
        answer: "No. All SHEEGOW ACADEMY lessons are live interactive video classes. Recordings and replays are not provided.",
      },
      {
        question: "How long is the beginner course?",
        answer: "The beginner course runs for 8 weeks. You attend live classes each week and complete short homework and quizzes to finish the course.",
      },
      {
        question: "How much does it cost and how do I pay?",
        answer: "The beginner course is $39. You can pay by card, Zaad or Edahab after enrolling. A free trial requires administrator approval.",
      },
    ],
    levels: ["Beginner"],
  },
};

export type LandingKey = keyof typeof LANDING_PAGES;
