import { db } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log("🌱 Seeding SHEEGOW ACADEMY database...");

  // ─── Admin user ───────────────────────────────────────
  const admin = await db.user.upsert({
    where: { email: "admin@sheegow.academy" },
    update: {},
    create: {
      fullName: "Admin User",
      email: "admin@sheegow.academy",
      phone: "+252 61 0000000",
      password: await hashPassword("admin123"),
      role: "admin",
      level: "Advanced",
      bio: "Platform administrator.",
    },
  });

  // ─── Demo student ─────────────────────────────────────
  const student = await db.user.upsert({
    where: { email: "student@sheegow.academy" },
    update: {},
    create: {
      fullName: "Ahmed Hassan",
      email: "student@sheegow.academy",
      phone: "+252 61 2345678",
      password: await hashPassword("student123"),
      role: "student",
      level: "Beginner",
      bio: "Eager to learn English for a better career.",
    },
  });

  // ─── Teachers ────────────────────────────────────────
  const teacher1 = await db.user.upsert({
    where: { email: "amina@sheegow.academy" },
    update: {},
    create: {
      fullName: "Amina Mohamed",
      email: "amina@sheegow.academy",
      phone: "+252 61 1111111",
      password: await hashPassword("teacher123"),
      role: "teacher",
      level: "Advanced",
      profilePicture: "/images/teacher-2.png",
      bio: "Certified English teacher with 8+ years of experience. Specializes in conversation and IELTS preparation. I love helping Somali students gain confidence in speaking English.",
    },
  });

  const teacher2 = await db.user.upsert({
    where: { email: "yusuf@sheegow.academy" },
    update: {},
    create: {
      fullName: "Yusuf Ali",
      email: "yusuf@sheegow.academy",
      phone: "+252 61 2222222",
      password: await hashPassword("teacher123"),
      role: "teacher",
      level: "Advanced",
      profilePicture: "/images/teacher-1.png",
      bio: "TESOL-certified instructor focused on business English and grammar. Former corporate trainer at international firms.",
    },
  });

  const teacher3 = await db.user.upsert({
    where: { email: "fatima@sheegow.academy" },
    update: {},
    create: {
      fullName: "Fatima Ibrahim",
      email: "fatima@sheegow.academy",
      phone: "+252 61 3333333",
      password: await hashPassword("teacher123"),
      role: "teacher",
      level: "Advanced",
      profilePicture: "/images/teacher-3.png",
      bio: "Specialist in teaching English to children and beginners. Creates fun, engaging lessons for young Somali learners.",
    },
  });

  // ─── Courses ─────────────────────────────────────────
  const courses = [
    {
      title: "English Conversation for Beginners",
      description:
        "Start speaking English from day one! This LIVE course helps absolute beginners build confidence in everyday conversations — greetings, introductions, shopping, travel, and more. Every lesson is a real-time video class with your teacher and classmates.",
      level: "Beginner",
      price: 39,
      duration: 8,
      image: "/images/course-beginner.png",
      teacherId: teacher3.id,
      whatYouLearn:
        "Introduce yourself and others confidently\nAsk and answer basic questions\nOrder food and shop in English\nHandle travel situations at airports and hotels\nBuild a vocabulary of 500+ useful words\nSpeak with correct pronunciation",
    },
    {
      title: "Intermediate English Mastery",
      description:
        "Take your English to the next level. This LIVE course focuses on fluent conversation, complex grammar, and real-world discussions. Join interactive video classes where you practice speaking with your teacher and peers every session.",
      level: "Intermediate",
      price: 49,
      duration: 10,
      image: "/images/course-conversation.png",
      teacherId: teacher1.id,
      whatYouLearn:
        "Speak fluently on familiar and unfamiliar topics\nMaster past, present, and future tenses\nExpress opinions and disagree politely\nUnderstand native speakers in conversation\nWrite clear emails and short essays\nExpand vocabulary to 1500+ words",
    },
    {
      title: "IELTS Preparation — Band 7+",
      description:
        "Achieve your target IELTS score with expert LIVE coaching. We cover all four skills — Listening, Reading, Writing, and Speaking — with mock tests and personalized feedback in every live session.",
      level: "IELTS",
      price: 79,
      duration: 12,
      image: "/images/course-ielts.png",
      teacherId: teacher1.id,
      whatYouLearn:
        "Master all four IELTS sections\nComplete full mock tests with feedback\nLearn proven strategies for each question type\nImprove your speaking with live practice\nWrite high-scoring Task 1 and Task 2 essays\nReach Band 7 or higher",
    },
    {
      title: "Business English Professional",
      description:
        "Communicate confidently in the workplace. This LIVE course covers meetings, presentations, negotiations, emails, and professional phone calls — all taught through real-time interactive video classes.",
      level: "Advanced",
      price: 69,
      duration: 8,
      image: "/images/course-business.png",
      teacherId: teacher2.id,
      whatYouLearn:
        "Lead and participate in meetings\nDeliver effective presentations\nWrite professional emails and reports\nNegotiate confidently in English\nHandle business phone calls\nBuild a powerful professional vocabulary",
    },
    {
      title: "English for Kids (Ages 7-12)",
      description:
        "Fun, interactive LIVE English classes for children! Through games, songs, and stories, kids learn to love English. Every class is a live video session with a friendly teacher and small groups.",
      level: "Kids",
      price: 29,
      duration: 6,
      image: "/images/course-kids.png",
      teacherId: teacher3.id,
      whatYouLearn:
        "Learn the alphabet and phonics\nBuild basic vocabulary with pictures\nSing English songs and play games\nTell simple stories in English\nDevelop a love for learning English\nGain confidence speaking with teachers",
    },
    {
      title: "Advanced English & Academic Writing",
      description:
        "For advanced learners aiming for mastery. This LIVE course dives into academic writing, critical thinking, and sophisticated expression. Perfect for university students and professionals.",
      level: "Advanced",
      price: 59,
      duration: 10,
      image: "/images/course-advanced.png",
      teacherId: teacher2.id,
      whatYouLearn:
        "Write academic essays and research papers\nAnalyze complex texts critically\nUse advanced grammar and idioms\nDeliver polished presentations\nPrepare for university-level study\nMaster formal and academic English",
    },
  ];

  const createdCourses = [];
  for (const c of courses) {
    const course = await db.course.create({ data: c });
    createdCourses.push(course);
  }

  // ─── Reviews ─────────────────────────────────────────
  const reviewData = [
    {
      courseIdx: 0,
      rating: 5,
      comment:
        "I could not speak any English before, but now I can introduce myself and have simple conversations. The live classes made all the difference!",
    },
    {
      courseIdx: 0,
      rating: 5,
      comment:
        "Teacher Fatima is amazing. The live video classes feel like real classroom. Highly recommend SHEEGOW ACADEMY!",
    },
    {
      courseIdx: 1,
      rating: 5,
      comment:
        "My English improved so much. I can now watch English movies without subtitles. The interactive live sessions are the best.",
    },
    {
      courseIdx: 2,
      rating: 5,
      comment:
        "I got IELTS Band 7.5 thanks to this course! The mock tests and live speaking practice were exactly what I needed.",
    },
    {
      courseIdx: 3,
      rating: 4,
      comment:
        "Great business English course. Helped me get a better job. The live negotiation practice was very useful.",
    },
    {
      courseIdx: 4,
      rating: 5,
      comment:
        "My daughter loves her English classes! She looks forward to every live session. Thank you SHEEGOW ACADEMY.",
    },
  ];

  for (const r of reviewData) {
    await db.review.create({
      data: {
        studentId: student.id,
        courseId: createdCourses[r.courseIdx].id,
        rating: r.rating,
        comment: r.comment,
      },
    });
  }

  // Update course ratings
  for (const course of createdCourses) {
    const reviews = await db.review.findMany({ where: { courseId: course.id } });
    if (reviews.length > 0) {
      const avg =
        reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      await db.course.update({
        where: { id: course.id },
        data: { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length },
      });
    }
  }

  // ─── Live classes (upcoming) ────────────────────────
  const now = new Date();
  const inHours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000);

  const liveClasses = [
    {
      courseId: createdCourses[0].id,
      teacherId: teacher3.id,
      title: "Live: Greetings & Introductions",
      description: "Practice introducing yourself in English with the class.",
      scheduledAt: inHours(2),
      duration: 60,
      status: "scheduled",
    },
    {
      courseId: createdCourses[1].id,
      teacherId: teacher1.id,
      title: "Live: Talking About Your Day",
      description: "Use past tense to describe your daily routine.",
      scheduledAt: inHours(6),
      duration: 60,
      status: "scheduled",
    },
    {
      courseId: createdCourses[2].id,
      teacherId: teacher1.id,
      title: "Live: IELTS Speaking Practice",
      description: "Full speaking mock test with feedback.",
      scheduledAt: inHours(24),
      duration: 90,
      status: "scheduled",
    },
    {
      courseId: createdCourses[3].id,
      teacherId: teacher2.id,
      title: "Live: Business Meeting Roleplay",
      description: "Practice leading and participating in meetings.",
      scheduledAt: inHours(-1),
      duration: 60,
      status: "live",
    },
    {
      courseId: createdCourses[4].id,
      teacherId: teacher3.id,
      title: "Live: Fun with Phonics",
      description: "Learn English sounds through songs and games.",
      scheduledAt: inHours(48),
      duration: 45,
      status: "scheduled",
    },
  ];

  for (const lc of liveClasses) {
    await db.liveClass.create({ data: lc });
  }

  // ─── Enrollment for demo student ─────────────────────
  const existing = await db.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: student.id,
        courseId: createdCourses[0].id,
      },
    },
  }).catch(() => null);

  if (!existing) {
    await db.enrollment.create({
      data: {
        studentId: student.id,
        courseId: createdCourses[0].id,
        progress: 35,
        status: "active",
      },
    });
  }

  // ─── Coupons ─────────────────────────────────────────
  await db.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: { code: "WELCOME10", discount: 10, active: true },
  });
  await db.coupon.upsert({
    where: { code: "SHEEGOW20" },
    update: {},
    create: { code: "SHEEGOW20", discount: 20, active: true },
  });

  console.log("✅ Seed complete!");
  console.log("   Admin:    admin@sheegow.academy / admin123");
  console.log("   Student:  student@sheegow.academy / student123");
  console.log("   Teacher:  amina@sheegow.academy / teacher123");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
