
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'student');
CREATE TYPE public.department_slug AS ENUM ('food-safety', 'biotechnology');

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en','ar')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============================================================
-- USER ROLES (separate table - critical for security)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  department_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, department_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of_department(_user_id UUID, _department_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin' AND department_id = _department_id
  );
$$;

CREATE POLICY "Super admin reads all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug department_slug NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  theme_color TEXT NOT NULL DEFAULT 'teal',
  icon TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.departments TO anon, authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Super admin manages departments" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- SUBJECTS
-- ============================================================
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subjects TO anon, authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Super admin manages subjects" ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- ACCESS CODES
-- ============================================================
CREATE TABLE public.access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  activated_by UUID REFERENCES auth.users(id),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  duration_days INT NOT NULL DEFAULT 30,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.access_codes TO authenticated;
GRANT ALL ON public.access_codes TO service_role;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin manages codes" ON public.access_codes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users read codes they activated" ON public.access_codes FOR SELECT TO authenticated USING (activated_by = auth.uid());

-- ============================================================
-- STUDENT ACCESS
-- ============================================================
CREATE TABLE public.student_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  code_id UUID REFERENCES public.access_codes(id),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_student_access_student ON public.student_access(student_id);
CREATE INDEX idx_student_access_valid ON public.student_access(student_id, department_id, expires_at);
GRANT SELECT ON public.student_access TO authenticated;
GRANT ALL ON public.student_access TO service_role;
ALTER TABLE public.student_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own access" ON public.student_access FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Super admin reads all access" ON public.student_access FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin manages access" ON public.student_access FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Helper: does a user currently have valid access to a department?
CREATE OR REPLACE FUNCTION public.has_valid_access(_user_id UUID, _department_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_access
    WHERE student_id = _user_id
      AND department_id = _department_id
      AND revoked = false
      AND expires_at > now()
  );
$$;

-- ============================================================
-- LECTURES / SECTIONS / SUMMARIES
-- ============================================================
CREATE TABLE public.lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  video_url TEXT,
  order_index INT NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lectures TO authenticated;
GRANT ALL ON public.lectures TO service_role;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Content readable with valid access or admin" ON public.lectures FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = lectures.subject_id
      AND (
        public.is_admin_of_department(auth.uid(), s.department_id)
        OR public.has_valid_access(auth.uid(), s.department_id)
      )
  )
);
CREATE POLICY "Admins manage lectures in their dept" ON public.lectures FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = lectures.subject_id AND public.is_admin_of_department(auth.uid(), s.department_id)
  )
) WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = lectures.subject_id AND public.is_admin_of_department(auth.uid(), s.department_id)
  )
);

CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  content_en TEXT,
  content_ar TEXT,
  content_url TEXT,
  order_index INT NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sections TO authenticated;
GRANT ALL ON public.sections TO service_role;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sections readable with valid access or admin" ON public.sections FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = sections.subject_id
      AND (
        public.is_admin_of_department(auth.uid(), s.department_id)
        OR public.has_valid_access(auth.uid(), s.department_id)
      )
  )
);
CREATE POLICY "Admins manage sections in their dept" ON public.sections FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = sections.subject_id AND public.is_admin_of_department(auth.uid(), s.department_id)
  )
) WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = sections.subject_id AND public.is_admin_of_department(auth.uid(), s.department_id)
  )
);

CREATE TABLE public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  file_url TEXT,
  content_en TEXT,
  content_ar TEXT,
  order_index INT NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.summaries TO authenticated;
GRANT ALL ON public.summaries TO service_role;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Summaries readable with valid access or admin" ON public.summaries FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.subjects s
    WHERE s.id = summaries.subject_id
      AND (
        public.is_admin_of_department(auth.uid(), s.department_id)
        OR public.has_valid_access(auth.uid(), s.department_id)
      )
  )
);
CREATE POLICY "Super admin manages summaries" ON public.summaries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- STUDENT PROGRESS
-- ============================================================
CREATE TABLE public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  last_accessed TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, lecture_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_progress TO authenticated;
GRANT ALL ON public.student_progress TO service_role;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own progress" ON public.student_progress FOR ALL TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- ============================================================
-- CODE ACTIVATION ATTEMPT LOG (rate limiting)
-- ============================================================
CREATE TABLE public.code_activation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_activation_attempts_user_time ON public.code_activation_attempts(user_id, attempted_at DESC);
GRANT SELECT, INSERT ON public.code_activation_attempts TO authenticated;
GRANT ALL ON public.code_activation_attempts TO service_role;
ALTER TABLE public.code_activation_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own attempts" ON public.code_activation_attempts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own attempts" ON public.code_activation_attempts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================================
-- TRIGGER: auto-create profile + assign default student role on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, preferred_language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SEED: 2 departments + sample bilingual subjects/content
-- ============================================================
INSERT INTO public.departments (slug, name_en, name_ar, description_en, description_ar, theme_color, icon, order_index) VALUES
('food-safety', 'Food Safety', 'سلامة الغذاء', 'Standards, hygiene, HACCP and quality control across the food chain.', 'المعايير والنظافة ونظام HACCP ومراقبة الجودة عبر سلسلة الغذاء.', 'teal', 'Leaf', 1),
('biotechnology', 'Biotechnology', 'التقنية الحيوية', 'Molecular biology, genetics and applied biotech for modern industry.', 'البيولوجيا الجزيئية وعلم الوراثة والتقنية الحيوية التطبيقية للصناعة الحديثة.', 'violet', 'Dna', 2);
