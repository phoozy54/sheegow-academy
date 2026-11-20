# Off-site SEO & local presence — SHEEGOW ACADEMY

These steps cannot be done from the codebase. They must be completed by the
account owner. Do them in this order.

## 1. Fixed NAP (use exactly this everywhere)

| Field | Value |
| --- | --- |
| Name | `SHEEGOW ACADEMY` |
| Public email | `info@sheegowacademy.com` |
| Phone / WhatsApp | `+252 63 4085151` |
| Address | `Hargeisa, Somaliland` |
| Website | `https://www.sheegowacademy.com` |

The old `hello@sheegow.academy` address is no longer shown publicly.
`superadmin@sheegow.academy` is an internal login identity only — never use it
as public contact information.

## 2. Google Business Profile (local "near me" searches)

1. Go to <https://www.google.com/business/> and sign in with a Google account
   that belongs to the academy.
2. Create the listing with the exact NAP above. Choose the category
   **Language school** (or the closest available) and add **Educational service**.
3. Website: `https://www.sheegowacademy.com`.
4. Set the service area to Hargeisa, Somaliland. If Google asks for a precise
   street address, add only the real address — never invent one.
5. Add a short description that matches the site:
   > SHEEGOW ACADEMY teaches English through live, interactive online classes
   > for Somali-speaking students. Courses include beginner English, IELTS
   > preparation, business English and kids classes. Taught live by Ciise
   > Mohamed Sheeq (SHEEGOW) from Hargeisa.
6. Upload a real profile photo of the teacher and a cover image. Do not use
   stock photos or fake student pictures.
7. Verify the listing (phone/email/video as offered by Google).
8. Post an update once a month and answer every question/review.

## 3. Social profiles (links are deliberately not on the site yet)

The website currently says **"Coming soon"** instead of fake `#` links. Once a
real profile exists, add its real URL to the footer and to the Google Business
Profile:

- YouTube — short live-class clips, a course intro, and a link back to
  `https://www.sheegowacademy.com/courses`
- Facebook — page for announcements and parent/student questions
- TikTok — short Somali/English speaking tips
- Instagram — class highlights and student progress (with permission)

Never create a profile just to fill a link — an empty profile hurts trust.

## 4. Student Google reviews

Ask only real students who actually attended live classes:

1. Send the Google Business Profile review link (from the dashboard) after a
   student completes a course or passes IELTS.
2. Ask in Somali and English, e.g.:
   > Haddii casharrada live-ka ah ee SHEEGOW ACADEMY ay ku caawieen, fadlan ku
   > qor dib-u-eegis Google-ka. Waxay caawinaysaa ardayda kale ee Hargeisa.
   >
   > If our live classes helped you, please leave an honest Google review — it
   > helps other students in Hargeisa find us.
3. Never buy reviews, incentivise them, or write them yourself. Reply to every
   genuine review, positive or negative.

## 5. Canonical redirect status (301 vs 308)

The chosen canonical origin is `https://www.sheegowacademy.com`. The app emits
matching `rel="canonical"` tags and redirects the Vercel preview domain to it.

Vercel implements platform-level HTTP→HTTPS and apex→www redirects with **308**,
and its configuration redirects (`permanent: true`) also emit **308**. A code-only
true **301** cannot override the platform redirect. Google explicitly treats 308
as a permanent redirect equivalent to 301 for canonicalization, so this does not
harm SEO.

If a strict 301 response code is required for compliance, put Cloudflare in front
of Vercel and create a **Bulk Redirect / Page Rule** (`301`) for
`sheegowacademy.com/*` → `https://www.sheegowacademy.com/$1`. That requires a DNS
change and is therefore an owner decision, not a code change.

## 6. After launch

- Submit `https://www.sheegowacademy.com/sitemap.xml` in Google Search Console
  and Bing Webmaster Tools.
- Use URL Inspection on `/`, `/courses`, one course page and one keyword page;
  click **Request indexing**.
- Check that the "Preferred domain" in Search Console is `www` and that the
  inspected canonical matches the served URL.
- Re-run PageSpeed Insights on mobile after each significant UI change.
