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

/**
 * Public landing-page copy. These pages are open to learners everywhere:
 * no single country, language or payment provider is presented as required.
 * Prices and payment methods are disclosed only in checkout.
 */
export const LANDING_PAGES: Record<string, LandingConfig> = {
  "barashada-ingiriisiga-online": {
    slug: "barashada-ingiriisiga-online",
    path: "/barashada-ingiriisiga-online",
    eyebrow: "Learn English online",
    title: "Learn English online — live classes",
    metaTitle: "Learn English Online — Live Classes",
    metaDescription:
      "Learn English online in live classes with a real teacher. Speak from the first lesson, practise every week, and join from anywhere in the world.",
    lead: "Learning English online works best when you actually speak. SHEEGOW ACADEMY offers interactive live video classes — never pre-recorded videos — with a teacher who sees you, hears you and guides you in real time.",
    sections: [
      {
        heading: "What you will learn",
        body: "Every course is built around live lessons, speaking practice, and feedback you get from your teacher straight away.",
        bullets: [
          "Speak English from the first class, without fear of making mistakes",
          "Learn practical words and expressions for everyday situations",
          "Practise listening, reading, writing and speaking in every lesson",
          "Get personal feedback and a clear view of your progress",
        ],
      },
      {
        heading: "How it works",
        body: "Create a free student account, choose the course that fits you, and join the live class. You can see and hear your teacher, ask questions in chat, and raise your hand.",
        bullets: [
          "Join from anywhere in the world",
          "Small, interactive online groups",
          "The full amount and available payment methods are shown at checkout",
          "A certificate is awarded once lessons, quizzes and homework are complete",
        ],
      },
    ],
    faqs: [
      {
        question: "Is learning English online free?",
        answer: "Student accounts are free. A free trial is possible only when an administrator approves it in advance. The full price of a paid course is shown at checkout.",
      },
      {
        question: "Are the classes recorded?",
        answer: "No. Every SHEEGOW ACADEMY class is live. We do not provide recordings or replays, so you join the teacher and classmates in real time.",
      },
      {
        question: "Who teaches the courses?",
        answer: "Ciise Mohamed Sheeq (SHEEGOW), an English expert with a university degree and 15 years of teaching experience, is the academy's real and sole teacher.",
      },
      {
        question: "Can I join from anywhere?",
        answer: "Yes. Classes are live online, so you can join from any country with a stable internet connection.",
      },
    ],
    levels: ["Beginner", "Intermediate", "Advanced"],
  },

  "koorso-ingiriisi-hargeisa": {
    slug: "koorso-ingiriisi-hargeisa",
    path: "/koorso-ingiriisi-hargeisa",
    eyebrow: "English courses online",
    title: "English courses — live online",
    metaTitle: "English Courses | Live Online",
    metaDescription:
      "Live online English courses: beginner, IELTS, business and more. Learn with a real teacher in interactive classes, wherever you are.",
    lead: "If you are looking for an English course where you really speak, you will not find pre-recorded videos here — you get a live class with a teacher who listens and corrects you in real time.",
    sections: [
      {
        heading: "Courses for every goal",
        body: "From first words and greetings to IELTS and the workplace, there is a clear path. Each course has lessons, practice and a quiz to complete.",
        bullets: [
          "English Conversation for Beginners — start from zero",
          "Intermediate English Mastery — speaking and grammar",
          "IELTS Preparation — all four exam parts",
          "Business English — meetings, presentations and email",
        ],
      },
      {
        heading: "What makes it different",
        body: "A real teacher sees you, hears you, and explains things when you get stuck. Classmates speak too, and chat is open for questions.",
        bullets: [
          "Live, interactive online classes",
          "Teacher Ciise — 15 years of teaching experience",
          "Clear progress tracking and a certificate on completion",
          "Payment details and methods shown only at checkout",
        ],
      },
    ],
    faqs: [
      {
        question: "Are the courses online or face to face?",
        answer: "Classes are live online video sessions, accessible from anywhere. We do not provide recordings — you speak directly with your teacher and classmates.",
      },
      {
        question: "Which course should I start with?",
        answer: "Beginners should start with English Conversation for Beginners. If you already know the basics, take Intermediate Mastery; if you need IELTS, take IELTS Preparation.",
      },
      {
        question: "How do I pay?",
        answer: "After you click Enroll, you will see a secure checkout with the full amount and the payment options available to you. A free trial is decided by an administrator.",
      },
      {
        question: "How can I contact the academy?",
        answer: "Email info@sheegowacademy.com or use the contact page. Our team will be happy to help you choose a course.",
      },
    ],
    levels: ["Beginner", "IELTS", "Advanced", "Business"],
  },

  "ielts-somali": {
    slug: "ielts-somali",
    path: "/ielts-somali",
    eyebrow: "IELTS preparation",
    title: "IELTS preparation — live classes",
    metaTitle: "IELTS Preparation — Live Course",
    metaDescription:
      "Prepare for IELTS with live coaching: Listening, Reading, Writing and Speaking, mock tests and personal feedback from an experienced teacher.",
    lead: "IELTS is competitive, and you need real feedback — not a video to watch. Our IELTS courses are live classes that cover all four parts of the exam.",
    sections: [
      {
        heading: "The four IELTS parts",
        body: "Every lesson includes practice and feedback. Your teacher listens to your speaking, reads your writing, and shows you how to raise your score.",
        bullets: [
          "Listening — understand exam accents and question types",
          "Reading — read quickly and understand deeply",
          "Writing — Task 1 and Task 2, marked and improved",
          "Speaking — Parts 1, 2 and 3 practised live",
        ],
      },
      {
        heading: "How we prepare you",
        body: "Mock tests, timed practice and personal feedback show what you already do well and where you can improve.",
        bullets: [
          "Mock tests with result analysis",
          "Personal feedback on writing and speaking",
          "Timed practice that mirrors the exam",
          "Learn from anywhere with a stable connection",
        ],
      },
    ],
    faqs: [
      {
        question: "Can you help me prepare for IELTS?",
        answer: "Yes. Our IELTS courses are live online and open to learners anywhere. All you need is a stable internet connection.",
      },
      {
        question: "Are there mock tests?",
        answer: "Yes. We run practice exams and give teacher feedback across all four parts of IELTS.",
      },
      {
        question: "Do you provide recordings?",
        answer: "No. All IELTS lessons are live. Recordings and replays are not provided, so you join at the scheduled time.",
      },
      {
        question: "How much does it cost?",
        answer: "The full amount is shown at checkout before you pay. A free trial requires administrator approval.",
      },
    ],
    levels: ["IELTS"],
  },

  "english-classes-for-somalis": {
    slug: "english-classes-for-somalis",
    path: "/english-classes-for-somalis",
    eyebrow: "Live English classes",
    title: "Live English classes for everyone",
    metaTitle: "Live English Classes — Learn Online",
    metaDescription:
      "Live English classes for learners everywhere. Speak in every lesson with a real teacher, practise out loud, and build confidence fast.",
    lead: "Our English classes are built around one simple idea: you must speak to learn. Every session is a live video class where your teacher sees you, hears you and corrects you in real time.",
    sections: [
      {
        heading: "Made for speakers, not spectators",
        body: "You do not learn a language by watching someone else talk. In our classes you speak from the first minute, make mistakes safely, and improve with feedback.",
        bullets: [
          "Beginner, intermediate, advanced, IELTS, business and kids courses",
          "Live video with chat and raise-hand — not pre-recorded videos",
          "Teacher Ciise, an English expert with 15 years of teaching experience",
          "Learn from anywhere with an internet connection",
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
        question: "Can I join from outside my country?",
        answer: "Yes. Students join live online from many countries. All you need is a stable internet connection and a device with a camera and microphone.",
      },
      {
        question: "How much do the courses cost?",
        answer: "The full amount for your chosen course is shown at checkout before you pay. A free trial is available only when an administrator approves it.",
      },
      {
        question: "Who is the teacher?",
        answer: "Ciise Mohamed Sheeq (SHEEGOW) is the academy's real and sole teacher. He is an English expert with a university degree and 15 years of teaching experience.",
      },
    ],
    levels: ["Beginner", "Intermediate", "Advanced", "IELTS", "Kids"],
  },

  "ingiriis-ku-hadal": {
    slug: "ingiriis-ku-hadal",
    path: "/ingiriis-ku-hadal",
    eyebrow: "Spoken English",
    title: "Speak English with confidence — live",
    metaTitle: "Spoken English — Live Classes",
    metaDescription:
      "Speak English with confidence in live classes. Talk with your teacher and classmates, practise real situations, and get instant feedback.",
    lead: "If you understand English but feel afraid to speak, you need classes where you talk — not watch. Here you speak from the beginning to the end of every lesson.",
    sections: [
      {
        heading: "Speaking is the foundation",
        body: "Every lesson has a speaking section: greetings, introductions, questions, short stories and discussion. Your teacher listens live and corrects pronunciation and grammar.",
        bullets: [
          "Speak with your teacher and classmates in every class",
          "Practise real situations: shopping, travel, work and exams",
          "Learn natural, everyday English expressions",
          "Get quick feedback that builds confidence",
        ],
      },
      {
        heading: "Learn from where you are",
        body: "Classes are online. You can speak from home using a phone or a computer — all you need is a stable connection.",
        bullets: [
          "Small, interactive online groups",
          "Live chat and raise-hand for questions",
          "Payment details shown only at checkout",
          "A free trial requires administrator approval",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I speak English if I am a complete beginner?",
        answer: "Yes. Beginner courses start with greetings and introductions. Your teacher guides you in small steps, and mistakes are part of learning.",
      },
      {
        question: "Are speaking lessons recorded?",
        answer: "No. We do not provide recordings. Each class is live, so you need to join at the scheduled time to take part.",
      },
      {
        question: "How many students are in a class?",
        answer: "Classes are small so everyone gets time to speak. You can use chat and raise-hand when you have a question.",
      },
      {
        question: "How do I get started?",
        answer: "Create a free student account, choose a course, and join the live class. If you want a trial, an administrator can approve it before you join.",
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
      "Start English from zero with live online classes. Greetings, travel and daily conversation with an experienced teacher and a supportive group.",
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
          "Clear explanations at every step",
          "Short homework and quizzes to lock in each lesson",
          "Certificate after lessons, quizzes and homework are complete",
        ],
      },
    ],
    faqs: [
      {
        question: "I have never learned English. Can I join?",
        answer: "Yes. English Conversation for Beginners is designed for absolute beginners. The teacher starts from greetings and simple sentences, and explains difficult points step by step.",
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
        answer: "The full amount is shown at checkout before you pay. A free trial requires administrator approval.",
      },
    ],
    levels: ["Beginner"],
  },
};

export type LandingKey = keyof typeof LANDING_PAGES;
