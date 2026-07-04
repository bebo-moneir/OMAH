
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_department_id_fkey
  FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;
