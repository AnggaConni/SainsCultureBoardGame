# Quiz bank structure

All knowledge-check content lives in data/quizzes.json; it is not embedded in js/sites.js or generated site records.

Each quiz has:
- id: stable unique ID. Correct answers award XP only once per quiz ID in the browser's saved progress.
- scope: exactly one of general, specialized, or site_type.
- topic, question, options, answerIndex, and explanation.
- sourceLabel and sourceUrl to show an optional source link after each question.

## Three scopes

### 1. General — all sites
Use scope "general". Do not set target fields. The question appears in every site journal, regardless of UNESCO programme.

### 2. Specialized — exact site(s)
Use scope "specialized" and a targetSiteIds array that contains one or more exact site.id values (for example, borobudur or komodo). These questions are prioritised before broader questions in that journal.

### 3. Site type — UNESCO programme
Use scope "site_type" and a targetSiteTypes array with one or more programmeKey values:
- world_heritage
- world_heritage_tentative
- global_geopark
- biosphere_reserve
- intangible_cultural_heritage
- creative_cities

A Tentative List record uses world_heritage_tentative and must not be treated as already inscribed on the World Heritage List.

## Example field values

A general question can use:
- id: general-plastic-pathways-02
- scope: general
- topic: Pollution
- answerIndex: 0
- sourceLabel: UNEP — Beat Plastic Pollution
- sourceUrl: https://www.unep.org/interactives/beat-plastic-pollution/

## Authoring and scoring rules

- Use distinct IDs. Never reuse an ID for a different question; the ID is the progress key.
- answerIndex is zero-based (the first option is 0).
- Provide three or four clear options and one unambiguous best answer.
- Keep explanations brief and educational, not punitive.
- Use authoritative, current source links. Do not present site-anchor coordinates as official boundaries.
- Correct answers grant 100 XP once per quiz ID; wrong answers show the explanation and can be retried when the question is visited again.
- On a site journal, the first available question is selected in this order: specialized, site type, general. Next question advances to the next unanswered compatible question; once all compatible questions are answered, the user can review them.
