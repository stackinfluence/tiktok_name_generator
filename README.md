# Stack Influence - TikTok Name Generator

A free, embeddable TikTok username generator. Enter a keyword or name, pick a
content category, and get ten TikTok-ready handles with a copy button and a
"check on TikTok" link on each.

This is a **Pattern B** tool (AI-powered). It calls the Anthropic API from a
Netlify serverless function so the API key stays server-side.

## Files

- `index.html` - the tool (single static file, 100% ASCII)
- `netlify/functions/generate.js` - serverless function; holds the key, calls the API, returns JSON
- `netlify.toml` - publish + functions config
- `webflow-embed-snippet.html` - iframe to paste into Webflow (swap in the real URL after deploy)
- `webflow-cms-copy.md` - copy for every Webflow CMS field

## Deploy (Netlify)

1. Push this repo to GitHub (or drag the folder into Netlify).
2. In Netlify, connect the repo. Build settings come from `netlify.toml`
   (publish `.`, functions `netlify/functions`). No build command needed.
3. **Set the API key**: Site configuration -> Environment variables ->
   add `ANTHROPIC_API_KEY` with your key. The function reads
   `process.env.ANTHROPIC_API_KEY`. Never commit the key to a file.
4. Deploy. Your function lives at `/.netlify/functions/generate`.
5. Confirm it works on the Netlify URL, then paste that URL into the Webflow
   embed snippet (both the `src` and the origin check) and embed it.

Note: Netlify's free plan blocks build triggers fired from API pushes, but
normal GitHub-connected deploys and manual deploys work fine.

## How it works

- The page posts `{ keyword, category, refine, creatorType }` to the function.
  `keyword` and `category` are required; `refine` is an array of up to two free-text
  extras (a sub-niche, vibe, or theme); `creatorType` is an optional identity
  (UGC creator, content creator, influencer, brand/business) that the model may
  weave into a few handles where it reads naturally.
- The function prompts the model (`claude-sonnet-4-6`) for exactly 10 ideas as a
  JSON array, strips any code fences, parses, and **sanitizes every username**
  to TikTok's allowed set (lowercase letters, numbers, `.`, `_`; 3-20 chars; no
  leading/trailing or doubled periods). Anything that fails the rules is dropped.
- The page renders each handle as `@username` with a copy button and a link to
  `tiktok.com/@username` so the user can check availability themselves. TikTok
  has no public availability API, which the disclaimer states plainly.

## Auto-resize

The tool posts its height to the parent on every content change using the unique
key `siTikNameHeight` (ResizeObserver on `document.body` plus a post on load).
The Webflow embed snippet listens for that key and resizes the iframe. The key is
unique so multiple tool embeds on one page do not collide.

## Tuning later

- **Categories**: edit the `CATEGORIES` array in `index.html` (id, label, emoji as
  `\u` escapes) and the matching `CATEGORY_GUIDANCE` map in `generate.js`. Keep the
  two in sync by `id`.
- **Creator types**: edit the `CREATOR_TYPES` array in `index.html`. The first
  entry (empty id, "No preference") is the default reset and should stay first. The
  chosen value is passed straight to the prompt, so a new label needs no function
  change.
- **Refine inputs**: the two optional free-text fields are combined into the
  `refine` array in `index.html` and shape some ideas without being forced into
  every handle (see `refineLine` in `generate.js`).
- **Number of results**: change "exactly 10" in the prompt in `generate.js` and the
  `.slice(0, 10)`, plus the results heading copy in `index.html`.
- **Username rules**: `sanitizeUsername()` in `generate.js` is the single source of
  truth for the character set and length. Adjust there if TikTok's rules change.
- **Model**: `MODEL` constant at the top of `generate.js`.

## ASCII check

    python3 -c "d=open('index.html','rb').read(); print('non-ASCII bytes:', len([x for x in d if x>127]))"

Must print 0 for both `index.html` and `generate.js`.
