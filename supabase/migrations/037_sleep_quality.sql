-- Migration 037: Add sleep_quality to body_stats
--
-- Frank's methodology: slaapkwaliteit is een directe proxy voor herstel.
-- Dattilo et al. (2011): slaapgebrek verhoogt cortisol, verlaagt testosteron,
-- remt spiereiwitsynthese — dezelfde markers als overtraining.
--
-- Een 5-punts schaal (1 = erg slecht, 5 = uitstekend) is eenvoudig te loggen
-- en correleert betrouwbaar met objectieve slaapkwaliteitsmetingen (PSQI proxy).

ALTER TABLE public.body_stats
  ADD COLUMN IF NOT EXISTS sleep_quality SMALLINT
    CHECK (sleep_quality BETWEEN 1 AND 5);

COMMENT ON COLUMN public.body_stats.sleep_quality IS
  'Subjectieve slaapkwaliteit 1–5 (1=erg slecht, 5=uitstekend). '
  'Wordt gebruikt door deload analytics om vermoeidheidsignalen te detecteren. '
  'Gebaseerd op Dattilo et al. 2011 (slaap-hormonale relatie).';
