
-- Uniqueness for subjects within a department (idempotent seeding)
CREATE UNIQUE INDEX IF NOT EXISTS subjects_dept_name_en_unique
  ON public.subjects (department_id, lower(name_en));

-- Seed 7 subjects per department, idempotent
WITH fs AS (SELECT id FROM public.departments WHERE slug = 'food-safety'),
     bt AS (SELECT id FROM public.departments WHERE slug = 'biotechnology')
INSERT INTO public.subjects (department_id, name_en, name_ar, description_en, description_ar, order_index)
SELECT * FROM (VALUES
  ((SELECT id FROM fs), 'Food Microbiology',            'الأحياء الدقيقة الغذائية',    'Microorganisms in food: spoilage, pathogens, and beneficial cultures.', 'الكائنات الدقيقة في الغذاء: الفساد والممرضات والمزارع النافعة.', 1),
  ((SELECT id FROM fs), 'HACCP & Food Safety Systems',  'نظام الهاسب وأنظمة سلامة الغذاء','Hazard analysis, critical control points, and food safety management.',  'تحليل المخاطر ونقاط التحكم الحرجة وإدارة سلامة الغذاء.', 2),
  ((SELECT id FROM fs), 'Food Chemistry',               'كيمياء الأغذية',              'Composition, reactions, and properties of food components.',              'تركيب وتفاعلات وخصائص مكونات الغذاء.', 3),
  ((SELECT id FROM fs), 'Food Processing & Preservation','تصنيع وحفظ الأغذية',         'Thermal, chemical, and physical methods to process and preserve food.',   'الطرق الحرارية والكيميائية والفيزيائية لتصنيع وحفظ الأغذية.', 4),
  ((SELECT id FROM fs), 'Food Quality Control',         'مراقبة جودة الغذاء',          'Sampling, testing, and quality assurance across the food chain.',         'أخذ العينات والاختبار وضمان الجودة عبر سلسلة الغذاء.', 5),
  ((SELECT id FROM fs), 'Sanitation & Hygiene',         'الصحة والنظافة الغذائية',      'Cleaning, sanitizing, and personal hygiene in food facilities.',          'التنظيف والتطهير والنظافة الشخصية في المنشآت الغذائية.', 6),
  ((SELECT id FROM fs), 'Food Regulations & Standards', 'التشريعات والمعايير الغذائية','International and local food laws, codex and labeling standards.',         'القوانين الغذائية الدولية والمحلية ومعايير التوسيم والكودكس.', 7),

  ((SELECT id FROM bt), 'Molecular Biology',            'البيولوجيا الجزيئية',         'DNA, RNA, proteins, and the central dogma of molecular biology.',         'الحمض النووي والحمض النووي الريبي والبروتينات والعقيدة المركزية.', 1),
  ((SELECT id FROM bt), 'Genetics',                     'علم الوراثة',                 'Mendelian and molecular genetics, inheritance, and variation.',           'الوراثة المندلية والجزيئية والتوريث والتنوع الجيني.', 2),
  ((SELECT id FROM bt), 'Microbiology',                 'علم الأحياء الدقيقة',         'Bacteria, viruses, fungi and their roles in biotechnology.',              'البكتيريا والفيروسات والفطريات ودورها في التقنية الحيوية.', 3),
  ((SELECT id FROM bt), 'Genetic Engineering',          'الهندسة الوراثية',            'Recombinant DNA, cloning, CRISPR, and gene editing techniques.',          'الحمض النووي المؤتلف والاستنساخ وتقنيات كريسبر وتعديل الجينات.', 4),
  ((SELECT id FROM bt), 'Bioprocess Technology',        'تقنية العمليات الحيوية',      'Fermentation, bioreactors, downstream processing at industrial scale.',   'التخمير والمفاعلات الحيوية ومعالجة الإنتاج على نطاق صناعي.', 5),
  ((SELECT id FROM bt), 'Immunology',                   'علم المناعة',                 'The immune system, antibodies, vaccines, and immunotherapies.',           'الجهاز المناعي والأجسام المضادة واللقاحات والعلاجات المناعية.', 6),
  ((SELECT id FROM bt), 'Bioinformatics',               'المعلوماتية الحيوية',         'Computational analysis of biological sequences and structures.',          'التحليل الحاسوبي للتسلسلات والتراكيب البيولوجية.', 7)
) AS v(department_id, name_en, name_ar, description_en, description_ar, order_index)
WHERE v.department_id IS NOT NULL
ON CONFLICT (department_id, lower(name_en)) DO NOTHING;
