-- EUNACOM Taxonomy Seed Script
-- Basado en la estructura oficial EUNACOM 2025
-- Incluye especialidades principales, subespecialidades y temas específicos

-- Limpiar datos existentes si es necesario (usar con precaución)
-- DELETE FROM "topics" WHERE 1=1;
-- DELETE FROM "specialties" WHERE 1=1;

-- ==============================================================================
-- MEDICINA INTERNA (37% del examen) - Especialidad principal
-- ==============================================================================

INSERT INTO "specialties" ("id", "name", "description", "code", "isActive", "parentId", "createdAt", "updatedAt")
VALUES
  ('med-interna', 'Medicina Interna', 'Especialidad médica que se dedica al estudio, diagnóstico y tratamiento de las enfermedades del adulto', 'MED_INT', true, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Subespecialidades de Medicina Interna
INSERT INTO "specialties" ("id", "name", "description", "code", "isActive", "parentId", "createdAt", "updatedAt")
VALUES
  ('cardiologia', 'Cardiología', 'Especialidad médica que se encarga del estudio, diagnóstico y tratamiento del corazón y sistema cardiovascular', 'CARDIO', true, 'med-interna', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('endocrinologia', 'Endocrinología', 'Especialidad médica que estudia las hormonas y las glándulas endocrinas', 'ENDOCRINO', true, 'med-interna', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('diabetes-nutricion', 'Diabetes y Nutrición', 'Especialidad enfocada en diabetes mellitus y trastornos nutricionales', 'DIABETES', true, 'med-interna', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('infectologia', 'Infectología', 'Especialidad médica que estudia las enfermedades infecciosas', 'INFECTO', true, 'med-interna', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('broncopulmonar', 'Broncopulmonar', 'Especialidad médica que trata las enfermedades del sistema respiratorio', 'BRONCO', true, 'med-interna', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gastroenterologia', 'Gastroenterología', 'Especialidad médica que estudia el sistema digestivo', 'GASTRO', true, 'med-interna', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('geriatria', 'Geriatría', 'Especialidad médica dedicada al cuidado de las personas mayores', 'GERIAT', true, 'med-interna', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hemato-oncologia', 'Hémato-oncología', 'Especialidad médica que trata las enfermedades de la sangre y el cáncer', 'HEMATO', true, 'med-interna', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('nefrologia', 'Nefrología', 'Especialidad médica que estudia las enfermedades del riñón', 'NEFRO', true, 'med-interna', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('neurologia', 'Neurología', 'Especialidad médica que estudia las enfermedades del sistema nervioso', 'NEURO', true, 'med-interna', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('reumatologia', 'Reumatología', 'Especialidad médica que estudia las enfermedades del sistema musculoesquelético', 'REUMA', true, 'med-interna', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- PEDIATRÍA (16% del examen) - Especialidad principal
-- ==============================================================================

INSERT INTO "specialties" ("id", "name", "description", "code", "isActive", "parentId", "createdAt", "updatedAt")
VALUES
  ('pediatria', 'Pediatría', 'Especialidad médica dedicada al cuidado de la salud de niños y adolescentes', 'PEDIA', true, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Subespecialidades de Pediatría
INSERT INTO "specialties" ("id", "name", "description", "code", "isActive", "parentId", "createdAt", "updatedAt")
VALUES
  ('pediatria-general', 'Pediatría General', 'Atención médica general en pacientes pediátricos', 'PEDIA_GEN', true, 'pediatria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('neonatologia', 'Neonatología', 'Especialidad que atiende recién nacidos', 'NEONA', true, 'pediatria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('neurologia-pediatrica', 'Neurología Pediátrica', 'Especialidad que trata enfermedades neurológicas en niños', 'NEURO_PED', true, 'pediatria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('infectologia-pediatrica', 'Infectología Pediátrica', 'Especialidad que trata infecciones en pacientes pediátricos', 'INFECTO_PED', true, 'pediatria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('endocrinologia-pediatrica', 'Endocrinología Pediátrica', 'Especialidad que trata trastornos endocrinos en niños', 'ENDOCRINO_PED', true, 'pediatria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- OBSTETRICIA Y GINECOLOGÍA (16% del examen) - Especialidad principal
-- ==============================================================================

INSERT INTO "specialties" ("id", "name", "description", "code", "isActive", "parentId", "createdAt", "updatedAt")
VALUES
  ('obstetricia-ginecologia', 'Obstetricia y Ginecología', 'Especialidad médica dedicada al cuidado de la salud reproductiva femenina', 'OBST_GINE', true, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Subespecialidades de Obstetricia y Ginecología
INSERT INTO "specialties" ("id", "name", "description", "code", "isActive", "parentId", "createdAt", "updatedAt")
VALUES
  ('obstetricia', 'Obstetricia', 'Especialidad que atiende el embarazo, parto y puerperio', 'OBST', true, 'obstetricia-ginecologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ginecologia', 'Ginecología', 'Especialidad que atiende el sistema reproductivo femenino', 'GINE', true, 'obstetricia-ginecologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('salud-reproductiva', 'Salud Reproductiva', 'Especialidad enfocada en planificación familiar y fertilidad', 'REPRO', true, 'obstetricia-ginecologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('patologia-mamaria', 'Patología Mamaria', 'Especialidad enfocada en enfermedades de la mama', 'MAMA', true, 'obstetricia-ginecologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- CIRUGÍA (12% del examen) - Especialidad principal
-- ==============================================================================

INSERT INTO "specialties" ("id", "name", "description", "code", "isActive", "parentId", "createdAt", "updatedAt")
VALUES
  ('cirugia', 'Cirugía', 'Especialidad médica que utiliza técnicas quirúrgicas para tratar enfermedades', 'CIR', true, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Subespecialidades de Cirugía
INSERT INTO "specialties" ("id", "name", "description", "code", "isActive", "parentId", "createdAt", "updatedAt")
VALUES
  ('cirugia-general', 'Cirugía General', 'Cirugía de abdomen, cuello y sistema endocrino', 'CIR_GEN', true, 'cirugia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('anestesia', 'Anestesia', 'Especialidad médica que proporciona anestesia y cuidado perioperatorio', 'ANEST', true, 'cirugia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('traumatologia', 'Traumatología', 'Especialidad que trata lesiones del sistema musculoesquelético', 'TRAUMA', true, 'cirugia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('urologia', 'Urología', 'Especialidad que trata enfermedades del sistema urogenital', 'URO', true, 'cirugia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- PSIQUIATRÍA (8% del examen) - Especialidad principal
-- ==============================================================================

INSERT INTO "specialties" ("id", "name", "description", "code", "isActive", "parentId", "createdAt", "updatedAt")
VALUES
  ('psiquiatria', 'Psiquiatría', 'Especialidad médica que diagnostica y trata trastornos mentales', 'PSIQ', true, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Subespecialidades de Psiquiatría
INSERT INTO "specialties" ("id", "name", "description", "code", "isActive", "parentId", "createdAt", "updatedAt")
VALUES
  ('psiquiatria-clinica', 'Psiquiatría Clínica', 'Psiquiatría general del adulto', 'PSIQ_CLIN', true, 'psiquiatria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psiquiatria-infantil', 'Psiquiatría Infantil', 'Psiquiatría especializada en niños y adolescentes', 'PSIQ_INF', true, 'psiquiatria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('adicciones', 'Adicciones', 'Especialidad que trata trastornos por uso de sustancias', 'ADICC', true, 'psiquiatria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('trastornos-mentales', 'Trastornos Mentales', 'Especialidad en trastornos psiquiátricos específicos', 'TRAST_MENT', true, 'psiquiatria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- ESPECIALIDADES MENORES (6% del examen) - Especialidad principal
-- ==============================================================================

INSERT INTO "specialties" ("id", "name", "description", "code", "isActive", "parentId", "createdAt", "updatedAt")
VALUES
  ('especialidades-menores', 'Especialidades Menores', 'Conjunto de especialidades con menor representación en EUNACOM', 'ESP_MEN', true, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Especialidades menores
INSERT INTO "specialties" ("id", "name", "description", "code", "isActive", "parentId", "createdAt", "updatedAt")
VALUES
  ('dermatologia', 'Dermatología', 'Especialidad que trata enfermedades de la piel', 'DERMATO', true, 'especialidades-menores', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('oftalmologia', 'Oftalmología', 'Especialidad que trata enfermedades del ojo', 'OFTALMO', true, 'especialidades-menores', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('otorrinolaringologia', 'Otorrinolaringología', 'Especialidad que trata enfermedades del oído, nariz y garganta', 'ORL', true, 'especialidades-menores', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- SALUD PÚBLICA (5% del examen) - Especialidad principal
-- ==============================================================================

INSERT INTO "specialties" ("id", "name", "description", "code", "isActive", "parentId", "createdAt", "updatedAt")
VALUES
  ('salud-publica', 'Salud Pública', 'Especialidad enfocada en la salud de las poblaciones', 'SALUD_PUB', true, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Subespecialidades de Salud Pública
INSERT INTO "specialties" ("id", "name", "description", "code", "isActive", "parentId", "createdAt", "updatedAt")
VALUES
  ('epidemiologia', 'Epidemiología', 'Estudio de la distribución y determinantes de las enfermedades', 'EPIDE', true, 'salud-publica', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gestion-sanitaria', 'Gestión Sanitaria', 'Administración y gestión de servicios de salud', 'GEST_SAN', true, 'salud-publica', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('politicas-salud', 'Políticas de Salud', 'Desarrollo y evaluación de políticas sanitarias', 'POL_SALUD', true, 'salud-publica', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;