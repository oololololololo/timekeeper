-- SCRIPT PARA GENERAR DATOS DE PRUEBA (Para demo dashboard)
-- Instrucciones: Copia y pega esto en el SQL Editor de Supabase.

DO $$
DECLARE
    v_user_id uuid;
    v_speaker_id_1 uuid;
    v_speaker_id_2 uuid;
    v_speaker_id_3 uuid;
    v_meeting_id_1 text := 'DEMO001';
    v_meeting_id_2 text := 'DEMO002';
BEGIN
    -- 1. OBTENER ID DEL USUARIO
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'tobias.alguibay@gmail.com';

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario tobias.alguibay@gmail.com no encontrado en auth.users';
    END IF;

    -- 2. LIMPIAR DATOS ANTERIORES (Opcional, para no duplicar si se corre varias veces)
    -- DELETE FROM meetings WHERE host_id = v_user_id; 
    -- DELETE FROM speakers WHERE user_id = v_user_id;

    -- 3. INSERTAR ORADORES
    INSERT INTO speakers (user_id, name, email, default_cost_per_hour)
    VALUES 
        (v_user_id, 'Ana García', 'ana@empresa.com', 50000) RETURNING id INTO v_speaker_id_1;

    INSERT INTO speakers (user_id, name, email, default_cost_per_hour)
    VALUES 
        (v_user_id, 'Carlos Ruiz', 'carlos@empresa.com', 45000) RETURNING id INTO v_speaker_id_2;

    INSERT INTO speakers (user_id, name, email, default_cost_per_hour)
    VALUES 
        (v_user_id, 'Elena Torres', 'elena@empresa.com', 60000) RETURNING id INTO v_speaker_id_3;

    
    -- 4. INSERTAR REUNIONES (Con métricas para el Dashboard)

    -- Reunión 1: Weekly Sync (Finalizada, con ahorro)
    -- Costo Mensual Promedio: 1.500.000 / 22 / 8 = ~8.522 CLP/hora
    -- Asistentes: 5
    -- Duración: 30 min planificados
    INSERT INTO meetings (id, host_id, title, status, created_at, speakers, meta, timer_state)
    VALUES (
        'DEMO_' || floor(random() * 1000)::text, -- ID aleatorio para evitar colisiones si se corre varias veces
        v_user_id,
        'Weekly Sync - Marketing',
        'finished',
        NOW() - INTERVAL '2 days', -- Hace 2 días
        jsonb_build_array(
            jsonb_build_object('name', 'Ana García', 'minutes', 10, 'speaker_id', v_speaker_id_1),
            jsonb_build_object('name', 'Carlos Ruiz', 'minutes', 15, 'speaker_id', v_speaker_id_2),
            jsonb_build_object('name', 'Elena Torres', 'minutes', 5, 'speaker_id', v_speaker_id_3)
        ),
        jsonb_build_object(
            'avgMonthlyCost', 1500000, 
            'attendees', 5, 
            'objective', 'Sincronizar campañas Q3',
            'shareCost', true
        ),
        '{"isRunning": false, "isPaused": true, "remainingSeconds": 0, "currentSpeakerIndex": 2}'::jsonb
    );

    -- Reunión 2: Estrategia Mensual (Finalizada)
    INSERT INTO meetings (id, host_id, title, status, created_at, speakers, meta, timer_state)
    VALUES (
        'DEMO_' || floor(random() * 1000)::text,
        v_user_id,
        'Revisión Estrategia Q3',
        'finished',
        NOW() - INTERVAL '5 days',
        jsonb_build_array(
            jsonb_build_object('name', 'Elena Torres', 'minutes', 20, 'speaker_id', v_speaker_id_3),
            jsonb_build_object('name', 'Ana García', 'minutes', 20, 'speaker_id', v_speaker_id_1)
        ),
        jsonb_build_object(
            'avgMonthlyCost', 2500000, -- Gerencia
            'attendees', 8, 
            'objective', 'Definir OKRs',
            'shareCost', true
        ),
        '{"isRunning": false, "isPaused": true, "remainingSeconds": 0, "currentSpeakerIndex": 1}'::jsonb
    );

    -- Reunión 3: Daily Standup (Pendiente)
    INSERT INTO meetings (id, host_id, title, status, created_at, speakers, meta, timer_state)
    VALUES (
        'DEMO_' || floor(random() * 1000)::text,
        v_user_id,
        'Daily Standup',
        'scheduled',
        NOW(), -- Hoy
        jsonb_build_array(
            jsonb_build_object('name', 'Equipo', 'minutes', 15)
        ),
        jsonb_build_object(
            'avgMonthlyCost', 1000000,
            'attendees', 6
        ),
        '{"isRunning": false, "isPaused": false, "remainingSeconds": 900, "currentSpeakerIndex": 0}'::jsonb
    );

END $$;
