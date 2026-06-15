## Resumen

Implementar de una vez: feed vertical tipo TikTok con paginación por cursor y autoplay, sistema real de likes / comentarios (con 1 nivel de respuestas) / follows, algoritmo de recomendación por afinidad, rediseño de la pantalla de subir video, y gestión de tus videos desde el perfil (borrar o marcar como privado, donde "privado" = solo tú lo ves).

## 1. Base de datos (1 sola migración)

Tablas nuevas en `public` (todas con RLS + GRANTs):

- `post_likes (post_id, user_id, created_at)` — PK compuesta. Trigger que mantiene `posts.likes` y, en INSERT, suma 1 al `user_art_affinity` del usuario para `posts.art`.
- `post_comments (id, post_id, user_id, parent_id, text, created_at)` — `parent_id` permite 1 nivel de respuestas. Trigger mantiene `posts.comments` (cuenta total).
- `comment_likes (comment_id, user_id, created_at)`.
- `follows (follower_id, following_id, created_at)` — PK compuesta, CHECK distinto.
- `user_art_affinity (user_id, art, score)` — PK (user_id, art). Alimenta el algoritmo.
- `duel_votes (duel_id, user_id, side)` — para que los votos también sean reales.

Cambios en tablas existentes:

- `posts.visibility text not null default 'public'` con CHECK in ('public','private').
- `posts.author_id uuid` (alias seguro de `user_id`, ya existe) — no, reutilizamos `user_id`.

RLS clave:

- `posts SELECT`: público sólo si `visibility = 'public'` o `user_id = auth.uid()`.
- `post_likes`, `comment_likes`, `follows`, `duel_votes`: lectura pública; insert/delete sólo el dueño (`auth.uid() = user_id` / `follower_id`).
- `post_comments`: lectura pública; insert autenticado con `auth.uid() = user_id`; delete sólo autor del comentario o autor del post.

Función RPC `get_feed(p_user_id uuid, p_cursor timestamptz, p_limit int)`:

- Devuelve posts visibles ordenados por un score = `0.5 * affinity(art) + 0.3 * follows_author + recency_decay`. Excluye los del propio usuario sólo si está autenticado y hay suficientes (fallback a cronológico si no).
- Paginación con cursor por `created_at` para mantener orden estable.

## 2. Feed tipo TikTok con scroll infinito

Reescritura de `src/routes/index.tsx`:

- Contenedor `h-[100dvh] overflow-y-scroll snap-y snap-mandatory`.
- Cada post: `snap-start h-[100dvh]` con `<video playsInline loop muted={!active}>` que se reproduce sólo cuando está en viewport (IntersectionObserver, threshold 0.7).
- Paginación con `useInfiniteQuery` (TanStack Query) llamando a un server fn `getFeedPage({ cursor, limit: 6 })` que invoca el RPC `get_feed`. Trigger del siguiente fetch cuando el usuario está a 2 posts del final.
- Overlay derecho con acciones (like, comentar, guardar, compartir) y overlay inferior con autor + caption + tags, estilo TikTok.
- Botón "Sign in" inline cuando un usuario anónimo intenta interactuar.

## 3. Likes, comentarios, follows reales

- `src/lib/social.functions.ts` con server fns autenticadas: `toggleLike`, `toggleSave` (queda local), `addComment`, `deleteComment`, `toggleCommentLike`, `toggleFollow`, `voteDuel`.
- `src/lib/store.ts`: dejar de ser fuente de verdad para likes/comments/follows; pasar a wrappers optimistic-update sobre TanStack Query (`useMutation` + `invalidateQueries`).
- Hoja de comentarios (`Sheet` de shadcn) con lista paginada, input para comentar, botón responder que abre input pre-rellenado con `@handle`, y mostrar respuestas anidadas 1 nivel.
- Botón "Follow" en el overlay del feed y en el perfil de otros; estado real desde `follows`.

## 4. Algoritmo (simple por afinidad)

- Trigger en `post_likes` incrementa `user_art_affinity.score` (+1 like, -1 unlike, mínimo 0).
- `get_feed` calcula score como combinación lineal y ordena DESC; cursor por `created_at` para paginación estable cuando los scores empatan.
- Fallback determinista si el usuario es anónimo: orden cronológico.

## 5. Pantalla de subir video (rediseño tipo TikTok)

Reescritura de `src/routes/_authenticated/create.tsx`:

```text
[ Preview pequeño 9:16   ]  Descripción (textarea)
[ con play/replay        ]  Hashtags (chips)
[ aspect-[9/16] w-32     ]  Arte / Nivel (selects)
                            Visibilidad: Público / Privado
                            ---------------------------------
                            [ Borrador ]  [ Publicar ]
```

- Preview limitado a `w-32 sm:w-40 aspect-[9/16]` en lugar de ocupar toda la pantalla.
- Inputs alineados a la derecha en desktop, debajo en móvil.
- Selector de visibilidad (Público / Privado) que se guarda en `posts.visibility`.
- Barra de progreso de subida ya existente reutilizada.

## 6. Gestión desde el perfil

En `src/routes/_authenticated/profile.tsx`:

- En cada video del grid: menú `...` con "Hacer privado / Hacer público" y "Borrar" (con confirmación).
- "Borrar" elimina la fila de `posts` y los objetos de Storage (video + poster).
- Badge "Privado" sobre miniaturas no públicas.

## Detalles técnicos

- Server fns nuevas en `src/lib/social.functions.ts` y `src/lib/feed.functions.ts`, todas con `requireSupabaseAuth` salvo `getFeedPage` que acepta anónimo (pasa `null` como user_id al RPC).
- Mantener `attachSupabaseAuth` ya registrado en `src/start.ts`.
- IntersectionObserver con `rootMargin: "-10% 0px"` para activar el video correcto.
- `useInfiniteQuery` con `getNextPageParam` devolviendo el `created_at` del último post.
- Tipos generados de Supabase se regeneran tras aprobar la migración; el código que los consume se escribe después.

## Orden de ejecución

1. Migración (esperar aprobación del usuario).
2. Server fns de feed + social.
3. Refactor del feed (`index.tsx`) con scroll infinito y autoplay.
4. Sheet de comentarios + botón follow real.
5. Rediseño de `create.tsx` + campo visibility.
6. Acciones de borrar / privado en `profile.tsx`.

## Fuera de alcance (para confirmar después si lo quieres)

- Notificaciones de nuevos seguidores / likes / comentarios.
- DMs.
- Subir más de un archivo a la vez / edición tras publicar.
