export type LessonSpec = { title: string; body: string };
export type ModuleSpec = { title: string; lessons: LessonSpec[] };
export type CourseSpec = {
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  duration: number; // weeks
  description: string;
  learn: string[];
  outline: ModuleSpec[];
};

export const COURSES: CourseSpec[] = [
  {
    title: "Workplace English & Meetings",
    level: "Intermediate",
    duration: 6,
    description:
      "Speak clearly in meetings, share updates, ask good questions and disagree respectfully. Built for professionals who already have the basics and need to be understood at work.",
    learn: [
      "Run and contribute to meetings with clear agenda language",
      "Give concise updates and ask for clarification politely",
      "Express agreement, disagreement and alternatives professionally",
      "Write follow-up notes and action items after a meeting",
    ],
    outline: [
      {
        title: "Meeting Essentials",
        lessons: [
          { title: "Before the meeting", body: "Read the agenda, prepare one clear objective and three key points. Learn phrases for opening: 'Let's get started', 'Today we need to decide…'." },
          { title: "Speaking up", body: "Use 'I'd like to add something' and 'Can I come in here?' to enter a discussion. Keep contributions to one idea at a time." },
          { title: "Clarifying", body: "Ask 'Could you explain that another way?' and 'So what you're saying is…' to confirm understanding before you respond." },
        ],
      },
      {
        title: "Discussion & Decisions",
        lessons: [
          { title: "Agreeing and disagreeing", body: "Soften disagreement: 'I see your point, but…' and 'I'm not sure I agree because…'. Always give a reason." },
          { title: "Handling interruptions", body: "Use 'Let me finish this point' and 'We'll come back to that' to manage the room without sounding defensive." },
          { title: "Reaching a decision", body: "Summarise options, state the decision and record owners: 'So we've agreed to…, and A will… by Friday.'" },
        ],
      },
      {
        title: "After the Meeting",
        lessons: [
          { title: "The follow-up email", body: "Write a short recap: decision, action items, owners, deadlines. Keep the subject line specific." },
          { title: "Reporting progress", body: "Use 'We're on track', 'There's a risk that…' and 'We need a decision on…' to give status without padding." },
          { title: "Review checklist", body: "Did I speak at least once? Did I ask a question? Did I understand the next step? Track this after every meeting." },
        ],
      },
    ],
  },
  {
    title: "Business Email & Professional Writing",
    level: "Intermediate",
    duration: 6,
    description:
      "Write emails, reports and proposals that are clear, polite and action-oriented. Learn structure, tone and the small language choices that make writing sound professional.",
    learn: [
      "Structure an email so the request is clear in the first two lines",
      "Adjust tone for clients, managers and colleagues",
      "Write short reports with findings and recommendations",
      "Proofread for common errors before sending",
    ],
    outline: [
      {
        title: "Email Foundations",
        lessons: [
          { title: "Subject lines", body: "Make the subject specific and action-based: 'Approval needed: Q3 budget by 20 Nov' beats 'Quick question'." },
          { title: "Opening and closing", body: "State purpose immediately: 'I'm writing to confirm…'. Close with a clear next step and deadline." },
          { title: "Polite requests", body: "Use 'Could you…', 'Would it be possible to…' and 'I'd appreciate it if…' instead of direct commands." },
        ],
      },
      {
        title: "Tone & Audience",
        lessons: [
          { title: "Formal vs friendly", body: "Match the relationship: 'Dear Ms Ali' for a new client, 'Hi Sam' for a close colleague. Avoid slang with external contacts." },
          { title: "Delivering bad news", body: "Start with context, state the issue plainly, then offer a solution. Never bury the main point." },
          { title: "Following up", body: "Reference the earlier message, restate the ask and give a deadline: 'Following my email of Monday, could you…?'" },
        ],
      },
      {
        title: "Reports & Proofreading",
        lessons: [
          { title: "Short reports", body: "Use four blocks: purpose, findings, recommendation, next steps. One idea per paragraph." },
          { title: "Common errors", body: "Check subject–verb agreement, article use (a/the), and confusing pairs like affect/effect and since/for." },
          { title: "Final checklist", body: "Read aloud once. Check names, dates, attachments and the recipient list before sending." },
        ],
      },
    ],
  },
  {
    title: "Job Interview English",
    level: "Intermediate",
    duration: 4,
    description:
      "Prepare confident answers for job interviews in English: introduce yourself, use the STAR method, discuss strengths and ask thoughtful questions.",
    learn: [
      "Give a 60-second professional introduction",
      "Answer competency questions using STAR",
      "Discuss strengths, gaps and salary expectations honestly",
      "Ask questions that show preparation and interest",
    ],
    outline: [
      {
        title: "First Impressions",
        lessons: [
          { title: "Your introduction", body: "Structure: who you are, years of experience, one strength, why this role. Practise until it sounds natural, not memorised." },
          { title: "Why this role", body: "Connect two real requirements in the job description to something you have actually done." },
          { title: "Nervousness", body: "Pause before answering. 'That's a good question — let me think for a moment' is professional and buys time." },
        ],
      },
      {
        title: "Competency Answers",
        lessons: [
          { title: "The STAR method", body: "Situation, Task, Action, Result. Spend most time on Action and give a measurable Result where you have one." },
          { title: "Strengths and weaknesses", body: "Choose a real strength with evidence. For a weakness, name a genuine area and the concrete step you are taking." },
          { title: "Experience gaps", body: "Be honest: 'I haven't used that tool, but I learned X in two weeks and can show you.'" },
        ],
      },
      {
        title: "Closing Well",
        lessons: [
          { title: "Questions for them", body: "Ask 'What does success look like in the first 90 days?' and 'How is the team measured?'" },
          { title: "Salary talk", body: "Give a researched range and ask about the full package: 'I'm looking at a range of…, depending on the benefits.'" },
          { title: "The thank-you note", body: "Send a short note within 24 hours, referencing one specific point from the conversation." },
        ],
      },
    ],
  },
  {
    title: "Public Speaking & Presentations",
    level: "Advanced",
    duration: 6,
    description:
      "Plan and deliver presentations that hold attention: structure, signposting, storytelling, voice and confident handling of questions.",
    learn: [
      "Build a clear beginning–middle–end structure",
      "Signpost so listeners always know where you are",
      "Use voice, pace and pauses for emphasis",
      "Handle questions and difficult audience members calmly",
    ],
    outline: [
      {
        title: "Structure",
        lessons: [
          { title: "One message", body: "Decide the single thing the audience should remember. Every slide should support it or be removed." },
          { title: "Opening", body: "Start with a problem, a question or a short story — not 'Today I'm going to talk about…'." },
          { title: "Signposting", body: "Use 'There are three reasons', 'Turning to the second point', and 'So what does this mean?'" },
        ],
      },
      {
        title: "Delivery",
        lessons: [
          { title: "Voice and pace", body: "Slow down for key numbers. Pause for two seconds after an important point. Vary tone to avoid a monotone." },
          { title: "Body language", body: "Stand with feet grounded, use open hands and make brief eye contact with different people." },
          { title: "Working with notes", body: "Use keywords, not a full script. Practise the first and last minute until they are secure." },
        ],
      },
      {
        title: "Audience",
        lessons: [
          { title: "Questions", body: "Repeat the question, answer briefly, then check: 'Does that answer your question?'" },
          { title: "Difficult moments", body: "Stay neutral: 'That's a fair point. Let me come back to it after this section.'" },
          { title: "Closing", body: "End with the one message and a clear call to action. Do not end with 'That's all I have.'" },
        ],
      },
    ],
  },
  {
    title: "Customer Service & Sales English",
    level: "Intermediate",
    duration: 6,
    description:
      "Handle client calls, complaints and sales conversations in English with empathy, clarity and a professional close.",
    learn: [
      "Greet and identify customer needs quickly",
      "Handle complaints with empathy and a clear next step",
      "Explain value without exaggerating or pressuring",
      "Close calls with a confirmed action and timeline",
    ],
    outline: [
      {
        title: "Customer Conversations",
        lessons: [
          { title: "The first minute", body: "Greet, introduce yourself and ask one open question: 'How can I help you today?'" },
          { title: "Active listening", body: "Reflect back: 'Let me make sure I understand — you need X by Friday, is that right?'" },
          { title: "Checking understanding", body: "Confirm before acting. It is cheaper to clarify than to fix the wrong request." },
        ],
      },
      {
        title: "Complaints",
        lessons: [
          { title: "Empathy first", body: "'I can see why that's frustrating' before any explanation. Never argue with the feeling." },
          { title: "Options, not excuses", body: "Offer two realistic options with timeframes: 'I can do X today or Y by Thursday.'" },
          { title: "Escalation", body: "Say what happens next and when: 'I'm escalating this to my manager; you'll hear from us by 3pm.'" },
        ],
      },
      {
        title: "Sales Language",
        lessons: [
          { title: "Asking about needs", body: "'What matters most to you here — price, speed or support?' lets you recommend honestly." },
          { title: "Explaining value", body: "Link a feature to the customer's stated need. Avoid claims you cannot support." },
          { title: "Closing", body: "Summarise agreement and next step: 'So we'll send the proposal by Friday. Does that work for you?'" },
        ],
      },
    ],
  },
  {
    title: "English for NGO & Health Work",
    level: "Intermediate",
    duration: 6,
    description:
      "Practical English for field teams: reports, donor updates, patient intake and sensitive conversations with communities.",
    learn: [
      "Write clear field and monitoring reports",
      "Give concise donor and stakeholder updates",
      "Conduct respectful patient or beneficiary intake",
      "Handle sensitive topics with accurate, neutral language",
    ],
    outline: [
      {
        title: "Field Reporting",
        lessons: [
          { title: "Facts first", body: "Separate what you observed from what you think. Use 'We observed…', 'Reported by…', 'Needs verification'." },
          { title: "Numbers clearly", body: "State the denominator: '18 of 120 households (15%)' is more useful than '18 households'." },
          { title: "Short updates", body: "Use situation → progress → constraint → next step. Keep donor updates to one page." },
        ],
      },
      {
        title: "Sensitive Conversations",
        lessons: [
          { title: "Intake questions", body: "Ask one question at a time, use plain words and confirm: 'Just to check, you arrived on Tuesday — correct?'" },
          { title: "Privacy", body: "Explain who will see the information and why. Never promise confidentiality you cannot guarantee." },
          { title: "Difficult news", body: "Be direct and kind: 'I'm afraid the result isn't available yet. Here's what happens next.'" },
        ],
      },
      {
        title: "Community Communication",
        lessons: [
          { title: "Plain language", body: "Replace jargon with everyday words. 'Please bring your card' beats 'Present identification documentation'." },
          { title: "Checking understanding", body: "Ask people to explain back in their own words, especially when using an interpreter." },
          { title: "Closing the loop", body: "Tell people when they will hear back and through which channel. Follow through." },
        ],
      },
    ],
  },
  {
    title: "English for Work: Beginner Foundations",
    level: "Beginner",
    duration: 8,
    description:
      "A gentle start for learners who need everyday English at work: greetings, simple questions, numbers, time and short introductions.",
    learn: [
      "Greet colleagues and introduce yourself simply",
      "Ask and answer basic questions about time, place and plans",
      "Use common workplace words and numbers accurately",
      "Read and write short workplace messages",
    ],
    outline: [
      {
        title: "First Words at Work",
        lessons: [
          { title: "Greetings", body: "'Good morning', 'Hi, I'm…', 'Nice to meet you'. Practise saying your name clearly and slowly." },
          { title: "Introducing yourself", body: "Three short sentences: your name, your role, where you work. 'I'm Amina. I work in the finance team.'" },
          { title: "Asking for help", body: "'Excuse me, can you help me?' and 'How do you say… in English?' are complete, useful sentences." },
        ],
      },
      {
        title: "Everyday Information",
        lessons: [
          { title: "Numbers and time", body: "Practise times, dates and prices. 'It's nine thirty' and 'The meeting is on Monday at ten.'" },
          { title: "Where things are", body: "Use 'on', 'in', 'next to': 'The file is on the desk.' Keep sentences short and correct." },
          { title: "Simple plans", body: "'I am busy now. I will call you later.' Learn the pattern 'I will…' for future actions." },
        ],
      },
      {
        title: "Short Messages",
        lessons: [
          { title: "A simple email", body: "'Hi Sam, I will send the file tomorrow. Thank you, Amina.' Short, clear messages are professional." },
          { title: "Common workplace words", body: "Learn ten words a week: meeting, deadline, file, team, report, client, schedule, budget, task, update." },
          { title: "Review", body: "Say your introduction without notes. Write one short message and read it aloud. Repeat weekly." },
        ],
      },
    ],
  },
  {
    title: "English for Work: Intermediate Fluency",
    level: "Intermediate",
    duration: 8,
    description:
      "Build fluency for daily work: small talk, phone calls, explaining problems and giving short updates without translating in your head.",
    learn: [
      "Make small talk naturally with colleagues and clients",
      "Handle phone calls and voicemails confidently",
      "Explain a problem and propose a solution",
      "Give a clear 60-second progress update",
    ],
    outline: [
      {
        title: "Everyday Fluency",
        lessons: [
          { title: "Small talk", body: "Use safe topics and short turns: 'How was your weekend?' 'Busy but good.' Ask one follow-up question." },
          { title: "Phone calls", body: "'Could you say that again, please?' and 'Let me repeat that to check' prevent mistakes." },
          { title: "Voicemail", body: "State name, purpose, one detail and a callback time. Keep it under 30 seconds." },
        ],
      },
      {
        title: "Problem Solving",
        lessons: [
          { title: "Explaining an issue", body: "Pattern: what happened, what it affects, what you have tried. Avoid long background." },
          { title: "Proposing a fix", body: "'One option is to…, which would mean…' gives the listener a decision to make." },
          { title: "Agreeing a next step", body: "Confirm owner and time: 'I'll send it by 4pm — does that work?'" },
        ],
      },
      {
        title: "Progress Updates",
        lessons: [
          { title: "The 60-second update", body: "Done, in progress, blocked, next. Four sentences, no filler." },
          { title: "Using blockers", body: "'I'm blocked on X. I need Y from Z by Tuesday.' Ask specifically, not vaguely." },
          { title: "Fluency habit", body: "Record yourself for one minute each day on a work topic. Listen once and note one improvement." },
        ],
      },
    ],
  },
];
