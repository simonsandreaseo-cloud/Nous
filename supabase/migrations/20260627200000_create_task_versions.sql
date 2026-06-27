BEGIN;

CREATE TABLE IF NOT EXISTS public.task_versions (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    content_body TEXT,
    process_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.task_versions ENABLE ROW LEVEL SECURITY;

-- Política simple: si pueden ver la tarea, pueden ver las versiones.
-- Asumiendo que la seguridad fuerte ya está en "tasks".
CREATE POLICY "Users can access task versions if they have access to the task"
ON public.task_versions
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.tasks
        WHERE tasks.id = task_versions.task_id
    )
);

-- Función para guardar versión y limitar a 10 por tarea
CREATE OR REPLACE FUNCTION public.save_task_version(
    p_task_id UUID,
    p_content_body TEXT,
    p_process_name TEXT
) RETURNS UUID AS $$
DECLARE
    v_new_id UUID;
BEGIN
    -- Insertar nueva versión
    INSERT INTO public.task_versions (task_id, content_body, process_name)
    VALUES (p_task_id, p_content_body, p_process_name)
    RETURNING id INTO v_new_id;

    -- Mantener sólo las últimas 10 versiones para esta tarea
    DELETE FROM public.task_versions
    WHERE task_id = p_task_id
      AND id NOT IN (
          SELECT id FROM public.task_versions
          WHERE task_id = p_task_id
          ORDER BY created_at DESC
          LIMIT 10
      );

    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
