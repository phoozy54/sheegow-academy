#!/bin/bash
# Regenerate images with valid sizes (multiples of 32, max 2^22 px)
cd /home/z/my-project

echo "=== Generating images ==="

z-ai image -p "Professional African Somali woman teacher smiling, modern online education hero banner, warm indigo and amber gradient background, books and laptop, premium e-learning platform aesthetic, high quality, wide cinematic" -o "./public/images/hero.png" -s 1344x768 2>&1 | tail -1
z-ai image -p "Online English conversation class, diverse students learning English via video call on laptop, modern flat illustration style, indigo and amber colors" -o "./public/images/course-conversation.png" -s 1344x768 2>&1 | tail -1
z-ai image -p "IELTS exam preparation, study materials and notebook with English grammar, books, modern educational illustration, indigo tones" -o "./public/images/course-ielts.png" -s 1344x768 2>&1 | tail -1
z-ai image -p "Children learning English ABC alphabet, colorful fun kids education illustration, friendly cartoon style" -o "./public/images/course-kids.png" -s 1344x768 2>&1 | tail -1
z-ai image -p "Business English professional meeting, corporate people talking in office, modern flat illustration, indigo amber palette" -o "./public/images/course-business.png" -s 1344x768 2>&1 | tail -1
z-ai image -p "Beginner English learning basics, ABC letters and simple words, friendly education illustration, soft colors" -o "./public/images/course-beginner.png" -s 1344x768 2>&1 | tail -1
z-ai image -p "Advanced English literature and writing, books quill paper, sophisticated academic illustration, dark indigo tones" -o "./public/images/course-advanced.png" -s 1344x768 2>&1 | tail -1
z-ai image -p "Abstract geometric pattern background, indigo and amber gradient, subtle dots and lines, modern website decoration" -o "./public/images/pattern.png" -s 1344x768 2>&1 | tail -1

echo "=== DONE ==="
