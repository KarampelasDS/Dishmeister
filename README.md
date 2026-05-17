# Dishmeister

<p align="center">
  <img src="public/favicon.svg" alt="Dishmeister logo" width="96" height="96" />
</p>

<p align="center">
  <strong>Discover, cook, save, and share recipes with a social-first food community.</strong>
</p>

<p align="center">
  <a href="https://dishmeister.com/">dishmeister.com</a>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111827" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=for-the-badge&logo=supabase&logoColor=0f172a" />
  <img alt="Vercel" src="https://img.shields.io/badge/Vercel-Edge-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

---

## What It Is

Dishmeister is a polished recipe-sharing web app built around a living food feed: creators publish recipes, people follow chefs, save dishes, react, comment, search, filter, and build their own little cookbook as they browse.

The app is designed to feel more like a social food platform than a static recipe index: image-forward recipe cards, profile pages, creator stats, saved and liked libraries, a personalized feed, and fast mobile-friendly navigation all work together as one experience.

## Feature Highlights

- **For You and Following feeds** with cached feed state, infinite scroll, and scroll restoration.
- **Explore page** with recipe and people search, category filtering, difficulty filtering, country-of-origin filtering, trending recipes, and top-rated sorting.
- **Recipe publishing flow** with image upload, image editing, compression, local draft persistence, ingredient ordering, instruction ordering, servings, timing, category, difficulty, and origin metadata.
- **Recipe detail pages** with hero imagery, ingredients, instructions, stats, likes, dislikes, saves, sharing, editing, deleting, reporting, and comments.
- **Creator profiles** with display names, usernames, bios, avatars, social links, recipe grids, stats, follow/unfollow, block/unblock, and privacy-aware social lists.
- **Personal library** for saved recipes and liked recipes.
- **Authentication** through Supabase with login, signup, email confirmation flow, password reset, and onboarding for incomplete profiles.
- **Community tools** including nested comment-style discussions, reactions, reporting modals, blocking, toasts, confirmation dialogs, and friendly error messages.
- **Responsive navigation** with a header, search bar, user menu, burger menu, and bottom dock.
- **Open Graph image generation** through Vercel Edge functions for rich social previews.
- **Light/dark theme support** with app-wide CSS variables and a dedicated theme hook.

## Tech Stack

| Layer      | Tools                                          |
| ---------- | ---------------------------------------------- |
| Frontend   | React 19, TypeScript, Vite                     |
| Routing    | React Router                                   |
| Backend    | Supabase Auth, Database, Storage, RPC          |
| UI         | CSS Modules, Lucide React, React Tooltip       |
| Media      | Browser image compression, React Avatar Editor |
| Metadata   | Vercel OG / Edge runtime                       |
| Deployment | Vercel-ready configuration                     |

## App Structure

```text
api/
  og.tsx             Dynamic Open Graph image generation
  render.tsx         Edge-rendered metadata helper

src/
  Components/        Reusable UI and feature components
  Context/           Auth, toast, and feed cache providers
  Hooks/             Theme, drafts, click-outside, scroll restoration
  pages/             Route-level screens
  utils/             Formatting, compression, and error helpers
  App.tsx            App shell and routes
  supabase.ts        Supabase client
```

## Core Routes

| Route                 | Purpose                        |
| --------------------- | ------------------------------ |
| `/`                   | Main social recipe feed        |
| `/explore`            | Discover recipes and people    |
| `/recipes`            | Paginated recipe listing       |
| `/recipes/new`        | Authenticated recipe creation  |
| `/recipes/:id`        | Full recipe view               |
| `/profiles/:username` | Public creator profile         |
| `/saved`              | Saved and liked recipe library |
| `/settings`           | Authenticated profile editing  |
| `/terms-of-service`   | Terms page                     |

## Ownership

Dishmeister is a personal project by **Dimitrios Spyridon Karampelas**.

Third-party packages, services, icons, and platform tools remain the property of their respective owners and are used through their own licenses or terms.

## License

Copyright (c) 2026 Dimitrios Spyridon Karampelas. All rights reserved.

This project is proprietary. No permission is granted to copy, modify, distribute, sublicense, or use the source code except with explicit written permission from the copyright holder.
