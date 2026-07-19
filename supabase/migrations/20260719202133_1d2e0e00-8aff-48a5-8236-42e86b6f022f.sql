
-- Categories
CREATE TABLE public.technique_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  art text NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (art, slug)
);
GRANT SELECT ON public.technique_categories TO anon, authenticated;
GRANT ALL ON public.technique_categories TO service_role;
ALTER TABLE public.technique_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_read_all" ON public.technique_categories FOR SELECT USING (true);

-- Techniques
CREATE TABLE public.techniques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.technique_categories(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  aka text[] NOT NULL DEFAULT '{}',
  from_position text,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, slug)
);
GRANT SELECT ON public.techniques TO anon, authenticated;
GRANT ALL ON public.techniques TO service_role;
ALTER TABLE public.techniques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "techniques_read_all" ON public.techniques FOR SELECT USING (true);
CREATE INDEX techniques_category_idx ON public.techniques(category_id);

-- Join table
CREATE TABLE public.post_techniques (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  technique_id uuid NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, technique_id)
);
GRANT SELECT ON public.post_techniques TO anon, authenticated;
GRANT INSERT, DELETE ON public.post_techniques TO authenticated;
GRANT ALL ON public.post_techniques TO service_role;
ALTER TABLE public.post_techniques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "post_techniques_read_all" ON public.post_techniques FOR SELECT USING (true);
CREATE POLICY "post_techniques_owner_insert" ON public.post_techniques FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()));
CREATE POLICY "post_techniques_owner_delete" ON public.post_techniques FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid()));
CREATE INDEX post_techniques_technique_idx ON public.post_techniques(technique_id);

-- Seed categories (BJJ)
INSERT INTO public.technique_categories (art, slug, name, description, sort_order) VALUES
  ('bjj','takedowns','Takedowns','Derribos desde de pie',1),
  ('bjj','guard-passes','Guard Passes','Pases de guardia',2),
  ('bjj','submissions','Submissions','Finalizaciones desde cada posición',3),
  ('bjj','sweeps','Sweeps','Barridas desde guardia',4),
  ('bjj','escapes','Escapes','Escapes de posiciones inferiores',5),
  ('bjj','guards','Guards','Guardias específicas',6),
  ('bjj','scrambles','Scrambles','Scrambles y transiciones',7);

-- Seed techniques
WITH c AS (SELECT slug, id FROM public.technique_categories WHERE art='bjj')
INSERT INTO public.techniques (category_id, slug, name, from_position, aka, sort_order)
SELECT (SELECT id FROM c WHERE slug=cat), t_slug, t_name, t_from, t_aka, t_order
FROM (VALUES
  -- Takedowns
  ('takedowns','double-leg','Double Leg','standing','{}'::text[],1),
  ('takedowns','single-leg','Single Leg','standing','{}'::text[],2),
  ('takedowns','ankle-pick','Ankle Pick','standing','{}'::text[],3),
  ('takedowns','osoto-gari','Osoto Gari','standing','{"Foot Sweep"}'::text[],4),
  ('takedowns','ouchi-gari','Ouchi Gari','standing','{}'::text[],5),
  ('takedowns','kouchi-gari','Kouchi Gari','standing','{}'::text[],6),
  ('takedowns','seoi-nage','Seoi Nage','standing','{}'::text[],7),
  ('takedowns','uchi-mata','Uchi Mata','standing','{}'::text[],8),
  ('takedowns','tomoe-nage','Tomoe Nage','standing','{}'::text[],9),
  ('takedowns','pull-guard','Pull Guard','standing','{}'::text[],10),
  ('takedowns','body-lock','Body Lock Takedown','standing','{}'::text[],11),
  ('takedowns','arm-drag','Arm Drag','standing','{}'::text[],12),
  -- Guard passes
  ('guard-passes','toreando','Toreando Pass','standing','{"Bullfighter"}'::text[],1),
  ('guard-passes','knee-cut','Knee Cut Pass','half_guard','{"Knee Slice"}'::text[],2),
  ('guard-passes','over-under','Over-Under Pass','half_guard','{}'::text[],3),
  ('guard-passes','leg-drag','Leg Drag','open_guard','{}'::text[],4),
  ('guard-passes','stack-pass','Stack Pass','closed_guard','{}'::text[],5),
  ('guard-passes','x-pass','X-Pass','open_guard','{}'::text[],6),
  ('guard-passes','long-step','Long Step','half_guard','{}'::text[],7),
  ('guard-passes','smash-pass','Smash Pass','half_guard','{}'::text[],8),
  ('guard-passes','double-under','Double Under Pass','closed_guard','{}'::text[],9),
  ('guard-passes','headquarters','Headquarters (HQ)','open_guard','{}'::text[],10),
  ('guard-passes','folding-pass','Folding Pass','open_guard','{}'::text[],11),
  -- Submissions
  ('submissions','kimura-side','Kimura','side_control','{}'::text[],1),
  ('submissions','kimura-guard','Kimura','guard','{}'::text[],2),
  ('submissions','kimura-north-south','Kimura','north_south','{}'::text[],3),
  ('submissions','armbar-mount','Armbar','mount','{"Juji Gatame"}'::text[],4),
  ('submissions','armbar-guard','Armbar','guard','{}'::text[],5),
  ('submissions','armbar-back','Armbar','back','{}'::text[],6),
  ('submissions','rnc','Rear Naked Choke','back','{"Mata Leão"}'::text[],7),
  ('submissions','bow-and-arrow','Bow and Arrow Choke','back','{}'::text[],8),
  ('submissions','triangle','Triangle Choke','guard','{"Sankaku Jime"}'::text[],9),
  ('submissions','omoplata','Omoplata','guard','{}'::text[],10),
  ('submissions','loop-choke','Loop Choke','guard','{}'::text[],11),
  ('submissions','ezekiel-mount','Ezekiel Choke','mount','{"Sode Guruma"}'::text[],12),
  ('submissions','americana-side','Americana','side_control','{"Keylock"}'::text[],13),
  ('submissions','americana-mount','Americana','mount','{}'::text[],14),
  ('submissions','heel-hook-inside','Inside Heel Hook','leg_entanglement','{}'::text[],15),
  ('submissions','heel-hook-outside','Outside Heel Hook','leg_entanglement','{}'::text[],16),
  ('submissions','kneebar','Kneebar','leg_entanglement','{}'::text[],17),
  ('submissions','straight-ankle-lock','Straight Ankle Lock','leg_entanglement','{"SAL"}'::text[],18),
  ('submissions','toe-hold','Toe Hold','leg_entanglement','{}'::text[],19),
  ('submissions','darce','D''Arce Choke','front_headlock','{}'::text[],20),
  ('submissions','anaconda','Anaconda Choke','front_headlock','{}'::text[],21),
  ('submissions','guillotine','Guillotine','front_headlock','{}'::text[],22),
  ('submissions','baseball-bat','Baseball Bat Choke','side_control','{}'::text[],23),
  ('submissions','cross-collar-mount','Cross Collar Choke','mount','{}'::text[],24),
  ('submissions','cross-collar-guard','Cross Collar Choke','guard','{}'::text[],25),
  ('submissions','north-south-choke','North-South Choke','north_south','{}'::text[],26),
  ('submissions','arm-triangle','Arm Triangle','mount','{"Kata Gatame"}'::text[],27),
  ('submissions','paper-cutter','Paper Cutter Choke','side_control','{}'::text[],28),
  -- Sweeps
  ('sweeps','scissor-sweep','Scissor Sweep','closed_guard','{}'::text[],1),
  ('sweeps','flower-sweep','Flower Sweep','closed_guard','{"Pendulum"}'::text[],2),
  ('sweeps','hip-bump','Hip Bump Sweep','closed_guard','{}'::text[],3),
  ('sweeps','butterfly-sweep','Butterfly Sweep','butterfly_guard','{}'::text[],4),
  ('sweeps','x-guard-sweep','X-Guard Sweep','x_guard','{}'::text[],5),
  ('sweeps','deep-half-sweep','Deep Half Sweep','deep_half','{}'::text[],6),
  ('sweeps','tripod-sweep','Tripod Sweep','open_guard','{}'::text[],7),
  ('sweeps','balloon-sweep','Balloon Sweep','open_guard','{}'::text[],8),
  ('sweeps','lumberjack-sweep','Lumberjack Sweep','closed_guard','{}'::text[],9),
  ('sweeps','tornado-sweep','Tornado Sweep','half_guard','{}'::text[],10),
  ('sweeps','waiter-sweep','Waiter Sweep','deep_half','{}'::text[],11),
  -- Escapes
  ('escapes','upa-escape','Upa Escape','mount','{"Bridge and Roll"}'::text[],1),
  ('escapes','elbow-knee-escape','Elbow-Knee Escape','mount','{}'::text[],2),
  ('escapes','shrimp-escape','Shrimp Escape','side_control','{}'::text[],3),
  ('escapes','underhook-escape','Underhook Escape','side_control','{}'::text[],4),
  ('escapes','back-escape','Back Escape','back','{}'::text[],5),
  ('escapes','guard-recovery','Guard Recovery','side_control','{}'::text[],6),
  ('escapes','ghost-escape','Ghost Escape','mount','{}'::text[],7),
  -- Guards
  ('guards','closed-guard','Closed Guard',NULL,'{}'::text[],1),
  ('guards','open-guard','Open Guard',NULL,'{}'::text[],2),
  ('guards','half-guard','Half Guard',NULL,'{}'::text[],3),
  ('guards','butterfly-guard','Butterfly Guard',NULL,'{}'::text[],4),
  ('guards','de-la-riva','De La Riva',NULL,'{"DLR"}'::text[],5),
  ('guards','reverse-de-la-riva','Reverse De La Riva',NULL,'{"RDLR"}'::text[],6),
  ('guards','spider-guard','Spider Guard',NULL,'{}'::text[],7),
  ('guards','lasso-guard','Lasso Guard',NULL,'{}'::text[],8),
  ('guards','x-guard','X-Guard',NULL,'{}'::text[],9),
  ('guards','single-leg-x','Single Leg X',NULL,'{"SLX","Ashi Garami"}'::text[],10),
  ('guards','fifty-fifty','50/50',NULL,'{}'::text[],11),
  ('guards','deep-half-guard','Deep Half Guard',NULL,'{}'::text[],12),
  ('guards','k-guard','K-Guard',NULL,'{}'::text[],13),
  ('guards','z-guard','Z-Guard',NULL,'{}'::text[],14),
  ('guards','rubber-guard','Rubber Guard',NULL,'{}'::text[],15),
  ('guards','worm-guard','Worm Guard',NULL,'{}'::text[],16),
  -- Scrambles
  ('scrambles','granby-roll','Granby Roll',NULL,'{}'::text[],1),
  ('scrambles','sit-out','Sit-Out',NULL,'{}'::text[],2),
  ('scrambles','wrestle-up','Wrestle-Up',NULL,'{}'::text[],3),
  ('scrambles','peek-out','Peek-Out',NULL,'{}'::text[],4),
  ('scrambles','turtle-recovery','Turtle Recovery',NULL,'{}'::text[],5)
) AS t(cat, t_slug, t_name, t_from, t_aka, t_order);
