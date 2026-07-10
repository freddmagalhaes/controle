-- ==========================================
-- SCRIPT DE SCHEMA DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- ==========================================

-- Extensões úteis (normalmente ativadas por padrão no Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA: usuarios_perfil
-- Relacionada ao auth.users do Supabase
CREATE TABLE IF NOT EXISTS public.usuarios_perfil (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'operador')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para usuarios_perfil
ALTER TABLE public.usuarios_perfil ENABLE ROW LEVEL SECURITY;

-- Trigger para criar o perfil do usuário na tabela pública automaticamente após cadastro no Auth
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios_perfil (id, nome, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'nome', 'Novo Usuário'),
        COALESCE(NEW.raw_user_meta_data ->> 'role', 'operador')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deleta o trigger antigo se existir
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;

CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_handle_new_user();

-- 2. TABELA: empresas
CREATE TABLE IF NOT EXISTS empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razao_social VARCHAR(150) NOT NULL,
    cnpj VARCHAR(14) UNIQUE NOT NULL CHECK (length(cnpj) = 14),
    status VARCHAR(20) DEFAULT 'ativa' NOT NULL CHECK (status IN ('ativa', 'inativa')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- 3. TABELA: contratos
CREATE TABLE IF NOT EXISTS contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'ativo' NOT NULL CHECK (status IN ('ativo', 'a_vencer', 'vencido')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_datas CHECK (data_fim >= data_inicio)
);

ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;

-- 4. TABELA: colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    cpf VARCHAR(11) UNIQUE NOT NULL CHECK (length(cpf) = 11),
    status VARCHAR(20) DEFAULT 'ativo' NOT NULL CHECK (status IN ('ativo', 'inativo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    data_inativacao TIMESTAMP WITH TIME ZONE
);

ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;

-- 5. TABELA: dependentes
CREATE TABLE IF NOT EXISTS dependentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    status VARCHAR(20) DEFAULT 'ativo' NOT NULL CHECK (status IN ('ativo', 'inativo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE dependentes ENABLE ROW LEVEL SECURITY;

-- 6. TABELA: cartoes
CREATE TABLE IF NOT EXISTS cartoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_cartao VARCHAR(50) UNIQUE NOT NULL,
    dono_id UUID NOT NULL,
    tipo_dono VARCHAR(20) NOT NULL CHECK (tipo_dono IN ('colaborador', 'dependente')),
    status VARCHAR(20) DEFAULT 'ativo' NOT NULL CHECK (status IN ('ativo', 'bloqueado', 'cancelado', 'reemitido')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE cartoes ENABLE ROW LEVEL SECURITY;

-- 7. TABELA: logs_auditoria
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios_perfil(id) ON DELETE SET NULL,
    tabela VARCHAR(50) NOT NULL,
    acao VARCHAR(20) NOT NULL CHECK (acao IN ('INSERT', 'UPDATE', 'DELETE')),
    dados JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE logs_auditoria ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- TRIGGERS DE INATIVAÇÃO LÓGICA E CASCADE
-- ==========================================

-- Trigger para Colaboradores
-- Quando um colaborador é inativado, inativa seus dependentes e bloqueia seus cartões
CREATE OR REPLACE FUNCTION fn_colaborador_inativacao_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'inativo' AND (OLD.status IS NULL OR OLD.status <> 'inativo') THEN
        -- Atualizar data de inativação se for nula
        NEW.data_inativacao := COALESCE(NEW.data_inativacao, NOW());

        -- Inativar dependentes
        UPDATE dependentes
        SET status = 'inativo'
        WHERE colaborador_id = NEW.id AND status = 'ativo';

        -- Bloquear cartões do colaborador
        UPDATE cartoes
        SET status = 'bloqueado'
        WHERE dono_id = NEW.id AND tipo_dono = 'colaborador' AND status = 'ativo';

        -- Bloquear cartões dos dependentes
        UPDATE cartoes
        SET status = 'bloqueado'
        WHERE dono_id IN (SELECT id FROM dependentes WHERE colaborador_id = NEW.id) 
          AND tipo_dono = 'dependente' 
          AND status = 'ativo';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_colaborador_inativacao
    BEFORE UPDATE ON colaboradores
    FOR EACH ROW
    EXECUTE FUNCTION fn_colaborador_inativacao_trigger();


-- Trigger para Dependentes
-- Quando um dependente é inativado, bloqueia seus cartões
CREATE OR REPLACE FUNCTION fn_dependente_inativacao_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'inativo' AND (OLD.status IS NULL OR OLD.status <> 'inativo') THEN
        -- Bloquear cartões do dependente
        UPDATE cartoes
        SET status = 'bloqueado'
        WHERE dono_id = NEW.id AND tipo_dono = 'dependente' AND status = 'ativo';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dependente_inativacao
    BEFORE UPDATE ON dependentes
    FOR EACH ROW
    EXECUTE FUNCTION fn_dependente_inativacao_trigger();


-- ==========================================
-- TRIGGERS DE AUDITORIA AUTOMÁTICA
-- ==========================================

CREATE OR REPLACE FUNCTION fn_process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id UUID;
    v_dados JSONB;
BEGIN
    -- Capturar o ID do usuário authenticado no Supabase
    -- Se não estiver no contexto HTTP/REST do Supabase, auth.uid() pode retornar NULL
    BEGIN
        v_usuario_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_usuario_id := NULL;
    END;

    -- Montar dados do snapshot
    IF (TG_OP = 'UPDATE') THEN
        v_dados := jsonb_build_object('antes', row_to_json(OLD), 'depois', row_to_json(NEW));
    ELSIF (TG_OP = 'INSERT') THEN
        v_dados := jsonb_build_object('depois', row_to_json(NEW));
    ELSIF (TG_OP = 'DELETE') THEN
        v_dados := jsonb_build_object('antes', row_to_json(OLD));
    END IF;

    -- Registrar log
    INSERT INTO logs_auditoria (usuario_id, tabela, acao, dados)
    VALUES (v_usuario_id, TG_TABLE_NAME, TG_OP, v_dados);

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar gatilho de auditoria (UPDATE apenas, conforme solicitado)
CREATE TRIGGER trg_auditoria_colaboradores
    AFTER UPDATE ON colaboradores
    FOR EACH ROW
    EXECUTE FUNCTION fn_process_audit_log();

CREATE TRIGGER trg_auditoria_cartoes
    AFTER UPDATE ON cartoes
    FOR EACH ROW
    EXECUTE FUNCTION fn_process_audit_log();

CREATE TRIGGER trg_auditoria_contratos
    AFTER UPDATE ON contratos
    FOR EACH ROW
    EXECUTE FUNCTION fn_process_audit_log();


-- ==========================================
-- JOB DE CRON AUTOMÁTICO DE CONTRATOS
-- ==========================================

CREATE OR REPLACE FUNCTION update_contracts_status()
RETURNS void AS $$
BEGIN
    -- 1. Se data_fim < CURRENT_DATE, altera o status para 'vencido'
    UPDATE contratos
    SET status = 'vencido'
    WHERE data_fim < CURRENT_DATE AND status <> 'vencido';

    -- 2. Se data_fim estiver a 30 dias ou menos e >= CURRENT_DATE, altera para 'a_vencer'
    UPDATE contratos
    SET status = 'a_vencer'
    WHERE data_fim >= CURRENT_DATE 
      AND data_fim <= (CURRENT_DATE + INTERVAL '30 days') 
      AND status <> 'a_vencer' 
      AND status <> 'vencido';
END;
$$ LANGUAGE plpgsql;

-- Para agendar no Supabase (usando a extensão pg_cron)
-- IMPORTANTE: requer privilégios de superusuário e extensão ativada
-- SELECT cron.schedule('update_contracts_status_job', '0 0 * * *', 'SELECT update_contracts_status()');


-- ==========================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Exemplo de política de RLS baseada na role do usuarios_perfil
-- 1. Empresas: Todos autenticados podem ver. Apenas admin pode inserir/editar.
CREATE POLICY "Empresas visíveis para todos perfis" ON empresas
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Apenas admin gerencia empresas" ON empresas
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM usuarios_perfil 
            WHERE usuarios_perfil.id = auth.uid() AND usuarios_perfil.role = 'admin'
        )
    );

-- 2. Contratos: Todos autenticados podem ver. Apenas admin gerencia.
CREATE POLICY "Contratos visíveis para todos perfis" ON contratos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Apenas admin gerencia contratos" ON contratos
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM usuarios_perfil 
            WHERE usuarios_perfil.id = auth.uid() AND usuarios_perfil.role = 'admin'
        )
    );

-- 3. Colaboradores: Qualquer operador ou admin pode visualizar e atualizar
CREATE POLICY "Qualquer operador/admin vê colaboradores" ON colaboradores
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Qualquer operador/admin gerencia colaboradores" ON colaboradores
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM usuarios_perfil 
            WHERE usuarios_perfil.id = auth.uid() AND usuarios_perfil.role IN ('admin', 'operador')
        )
    );

-- 4. Dependentes: Qualquer operador ou admin pode gerenciar
CREATE POLICY "Qualquer operador/admin gerencia dependentes" ON dependentes
    FOR ALL TO authenticated USING (true);

-- 5. Cartões: Qualquer operador ou admin pode gerenciar
CREATE POLICY "Qualquer operador/admin gerencia cartoes" ON cartoes
    FOR ALL TO authenticated USING (true);

-- 6. Logs de Auditoria: Apenas admins podem ler. Ninguém pode editar/deletar diretamente (somente leitura para admin)
CREATE POLICY "Apenas admin lê logs de auditoria" ON logs_auditoria
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM usuarios_perfil 
            WHERE usuarios_perfil.id = auth.uid() AND usuarios_perfil.role = 'admin'
        )
    );


-- ==========================================
-- SEMENTE DE DADOS DE TESTE (SEED DATA)
-- ==========================================

-- Inserir usuários de teste no Auth do Supabase (para ambiente de desenvolvimento local / produção inicial)
-- A senha '123456' encriptada pelo bcrypt com salt padrão do Supabase é '$2a$10$wS2a1tN7Q/h9.pCjZJ62l.hG2o3r14pX4T8t2dF6/K9g7.4x4k3L.'
-- Nota: O trigger trg_on_auth_user_created inserido acima criará automaticamente o perfil em usuarios_perfil
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role)
VALUES 
  ('d3b07384-d113-4956-a5db-e7c5b62b10a1', 'admin@sistema.com', '$2a$10$wS2a1tN7Q/h9.pCjZJ62l.hG2o3r14pX4T8t2dF6/K9g7.4x4k3L.', NOW(), '{"provider":"email","providers":["email"]}', '{"nome":"Carlos Silva (Admin)","role":"admin"}', NOW(), NOW(), 'authenticated'),
  ('d3b07384-d113-4956-a5db-e7c5b62b10a2', 'operador@sistema.com', '$2a$10$wS2a1tN7Q/h9.pCjZJ62l.hG2o3r14pX4T8t2dF6/K9g7.4x4k3L.', NOW(), '{"provider":"email","providers":["email"]}', '{"nome":"Mariana Souza (Operador)","role":"operador"}', NOW(), NOW(), 'authenticated')
ON CONFLICT (id) DO NOTHING;

