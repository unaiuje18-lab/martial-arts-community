
## Resumen

Añadir un catálogo curado de técnicas de BJJ organizado por categorías (Takedowns, Pases de guardia, Finalizaciones, Sweeps, Escapes, Guardias específicas, Wrestling/scrambles). En el buscador aparece una pestaña "Techniques" que navega Categoría → Técnica. Al abrir una técnica se listan todos los vídeos etiquetados con ella. Al subir un vídeo se pueden seleccionar 1–3 técnicas.

## 1. Base de datos (1 migración)

Estructura preparada para más artes en el futuro, pero seed solo BJJ.

- `technique_categories (id, art text, slug text, name text, description text, sort_order int)` — PK id, UNIQUE (art, slug). Seed BJJ: `takedowns`, `guard-passes`, `submissions`, `sweeps`, `escapes`, `guards`, `scrambles`.
- `techniques (id, category_id fk, slug, name, aka text[], from_position text, description text, sort_order int)` — UNIQUE (category_id, slug). `from_position` para "finalizaciones desde X" (mount, back, side control, guard, half guard, etc.).
- `post_techniques (post_id fk posts, technique_id fk techniques, PRIMARY KEY (post_id, technique_id))` — join.

RLS + GRANTs:
- `technique_categories`, `techniques`: lectura pública (`TO anon, authenticated`), sin escritura desde app.
- `post_techniques`: lectura pública; insert/delete solo si `auth.uid()` es dueño del post referenciado (subquery a `posts.user_id`).

Seed BJJ curado en la misma migración (~80–120 técnicas). Ejemplos:
- Takedowns: Double leg, Single leg, Ankle pick, Foot sweep (Osoto/Ouchi), Seoi nagi, Kouchi, Pull guard.
- Guard passes: Toreando, Knee cut, Over-under, Leg drag, Stack pass, X-pass, Long step, Smash pass.
- Submissions (agrupadas por `from_position`): Kimura from side/guard/north-south, Armbar from mount/guard/back, RNC from back, Bow & arrow, Triangle from guard, Omoplata, Loop choke, Ezequiel from mount, Americana from side/mount, Heel hook (inside/outside), Kneebar, Straight ankle lock, Toe hold, D'arce, Anaconda, Guillotine, Baseball bat choke, Cross collar from mount/guard.
- Sweeps: Scissor, Flower, Hip bump, Butterfly, X-guard, Deep half, Tripod, Balloon, Lumberjack.
- Escapes: Mount escape (upa/elbow), Side control escape, Back escape, Guard recovery.
- Guardias específicas (posición base): Closed, Open, Half, Butterfly, De la Riva, Reverse DLR, Spider, Lasso, X, Single-leg X, 50/50, Deep half, K-guard, Z-guard.
- Scrambles: Granby roll, Sit-out, Wrestle-up, Peek-out.

## 2. Subida de vídeo — selector de técnicas

En `src/routes/_authenticated/create.tsx`:
- Nuevo campo debajo de la descripción: **Techniques (1–3)**.
- Combobox con búsqueda (shadcn `Command` en `Popover`) que consulta `techniques` con un JOIN a `technique_categories` filtrando por `art = 'bjj'`. Muestra `name` + badge de categoría + `from_position` cuando aplica.
- Chips seleccionados debajo con botón de quitar. Límite 3.
- Al publicar, tras insertar en `posts`, insertar filas en `post_techniques`.

## 3. Buscador — pestaña Techniques

En `src/routes/search.tsx`:
- Añadir pestañas en la cabecera: **Videos** (comportamiento actual) | **Techniques**.
- Vista Techniques (por defecto muestra categorías):
  - Grid de tarjetas: una por categoría con nombre, descripción corta y contador de técnicas.
  - Buscador que filtra técnicas por nombre/aka a través de todas las categorías (resultados agrupados por categoría).
- Al tocar una categoría → nueva ruta `/technique-category/$slug` que lista las técnicas (agrupadas por `from_position` cuando exista, ej. Submissions from Mount / Back / Guard…).
- Al tocar una técnica → nueva ruta `/technique/$slug` que muestra:
  - Header con nombre, categoría, aka, posición de origen, descripción.
  - Grid tipo TikTok de miniaturas: todos los `posts` públicos vinculados a esa técnica vía `post_techniques`, ordenados por más recientes/más likes. Tocar una miniatura abre el post (por ahora navega al feed con `?post=id`, ampliable después).

## 4. i18n

Añadir claves EN/ES para: `search.tab.videos`, `search.tab.techniques`, `techniques.categories.*` (nombres de las 7 categorías), `techniques.from.*` (mount, back, side, guard, half_guard, standing…), `create.techniques.label`, `create.techniques.placeholder`, `create.techniques.limit`.

## Detalles técnicos

- Rutas nuevas: `src/routes/technique-category.$slug.tsx`, `src/routes/technique.$slug.tsx`. Ambas públicas (SSR) con `head()` propio y loader que usa `context.queryClient.ensureQueryData` + `useSuspenseQuery`.
- Fetchers en `src/lib/techniques.ts` (browser client, todo lectura pública anon):
  - `fetchCategories(art)`, `fetchTechniquesByCategory(slug)`, `fetchTechniqueBySlug(slug)`, `fetchPostsForTechnique(techniqueId, cursor, limit)`, `searchTechniques(query, art)`.
- Mutación al crear post: `insertPostTechniques(postId, techniqueIds)` en `src/lib/social.ts`.
- El feed principal (`get_feed`) no cambia. La afinidad por arte sigue funcionando; en una fase futura se podría refinar por técnica si quieres.

## Orden de ejecución

1. Migración con tablas + seed (esperar aprobación).
2. `techniques.ts` fetchers + tipos.
3. Selector de técnicas en `create.tsx` + insert de `post_techniques`.
4. Pestañas + vista Techniques en `search.tsx`.
5. Rutas `technique-category.$slug.tsx` y `technique.$slug.tsx`.
6. Claves i18n.

## Fuera de alcance

- Editar técnicas de un post ya publicado (se puede añadir después desde el perfil).
- Sugerencias de usuarios / moderación.
- Otras artes (Kickboxing, Judo…): la estructura ya lo permite, pero el seed y la UI solo cubren BJJ ahora.
