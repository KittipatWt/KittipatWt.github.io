# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Static GitHub Pages site (`KittipatWt.github.io`) for the course 204252 Data Structures and Analysis: Thai-language lesson pages with interactive simulators, plus lecture PDFs. There is no build step, package manager, linter or test suite. Pushing to `main` deploys. To preview locally, serve the repo root, e.g. `python3 -m http.server`, and open `index.html`.

## Structure

- `index.html` — home page; one `<a class="card">` per chapter (a commented template shows how to add one; `class="card soon"` marks an unreleased chapter).
- `chapters/chapter-NN.html` — one self-contained lesson per chapter. Only chapter 7 exists so far. It has a sticky TOC (`<aside class="toc">`), an `<article>` of numbered `<h2 id>` sections, and code samples in `<div class="code">` blocks highlighted by highlight.js (cpp language, loaded from cdnjs).
- `assets/style.css` — the single stylesheet shared by every page, including the simulator styles (`.tree`, `.arr`).
- `assets/heap.js` — `renderTree` draws a heap as SVG. It takes a 1-indexed array (`arr[0]` unused, `null` = hole) and an opts object (`hole`, `cmp`, `done`, `bad`, `idx`, `held`).
- `assets/sim.js` — the min-heap simulator. It precomputes a list of "frames" for insert or deleteMin (`buildInsert`/`buildDelete`), then `show`/`play` step through them using `heap.js` for rendering. It is wired to elements by id in the chapter page.
- `files/` — lecture PDFs (`Chapter_NN_Topic_Part_N.pdf`), including chapters 8–11 whose lesson pages don't exist yet. They are served as static files and referenced by relative path.

## Conventions

- Page language is Thai (`lang="th"`); keep content, comments and simulator messages in Thai, with technical terms in English.
- Fonts are set through CSS variables in `style.css`: `--font-head` (Prompt) for headings, `--font-body` (Google Sans) for text, `--font-code` (Google Sans Code) for `code`/`pre`, code-block headers and the simulator SVG/array text. Use these variables rather than hard-coding `font-family`. Fonts load via `@import` from Google Fonts, so no font files live in the repo.
- Colors come from CSS variables in `:root`, with a dark-mode override under `prefers-color-scheme` guarded by `:root:not([data-theme="light"])`. Add new colors as variables for both themes.
- New chapter pages should copy `chapter-07.html`: they link `../assets/style.css`, the two highlight.js themes (light/dark by media query), and the scripts at the bottom of the page. Add the matching card to `index.html`.
