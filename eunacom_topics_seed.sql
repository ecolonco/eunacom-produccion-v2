-- EUNACOM Topics/Temas Seed Script
-- Temas específicos para cada especialidad basados en perfil EUNACOM oficial

-- ==============================================================================
-- TEMAS DE CARDIOLOGÍA
-- ==============================================================================

INSERT INTO "topics" ("id", "name", "description", "specialtyId", "createdAt", "updatedAt")
VALUES
  ('cardio-insuf-cardiaca', 'Insuficiencia Cardíaca', 'Trastorno en el cual el corazón no puede bombear suficiente sangre', 'cardiologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cardio-hipertension', 'Hipertensión Arterial', 'Presión arterial elevada de forma sostenida', 'cardiologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cardio-cardiopatia-isquemica', 'Cardiopatía Isquémica', 'Enfermedad coronaria y síndrome coronario agudo', 'cardiologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cardio-arritmias', 'Arritmias', 'Trastornos del ritmo cardíaco', 'cardiologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cardio-valvulopatias', 'Valvulopatías', 'Enfermedades de las válvulas cardíacas', 'cardiologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cardio-pericarditis', 'Pericarditis', 'Inflamación del pericardio', 'cardiologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cardio-endocarditis', 'Endocarditis', 'Infección del endocardio', 'cardiologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name, "specialtyId") DO NOTHING;

-- ==============================================================================
-- TEMAS DE ENDOCRINOLOGÍA
-- ==============================================================================

INSERT INTO "topics" ("id", "name", "description", "specialtyId", "createdAt", "updatedAt")
VALUES
  ('endocrino-diabetes-mellitus', 'Diabetes Mellitus', 'Trastorno metabólico caracterizado por hiperglicemia', 'endocrinologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('endocrino-tiroides', 'Patología Tiroidea', 'Hipotiroidismo, hipertiroidismo y nódulos tiroideos', 'endocrinologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('endocrino-suprarrenales', 'Patología Suprarrenal', 'Insuficiencia suprarrenal y síndrome de Cushing', 'endocrinologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('endocrino-hipofisis', 'Patología Hipofisaria', 'Adenomas hipofisarios y trastornos hormonales', 'endocrinologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('endocrino-metabolismo-lipidos', 'Metabolismo de Lípidos', 'Dislipidemias y trastornos metabólicos', 'endocrinologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name, "specialtyId") DO NOTHING;

-- ==============================================================================
-- TEMAS DE INFECTOLOGÍA
-- ==============================================================================

INSERT INTO "topics" ("id", "name", "description", "specialtyId", "createdAt", "updatedAt")
VALUES
  ('infecto-sepsis', 'Sepsis y Shock Séptico', 'Respuesta inflamatoria sistémica a la infección', 'infectologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('infecto-neumonia', 'Neumonía', 'Infección del parénquima pulmonar', 'infectologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('infecto-itu', 'Infecciones del Tracto Urinario', 'ITU complicadas y no complicadas', 'infectologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('infecto-vih', 'VIH/SIDA', 'Infección por virus de inmunodeficiencia humana', 'infectologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('infecto-hepatitis', 'Hepatitis Virales', 'Hepatitis A, B, C y otras', 'infectologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('infecto-tuberculosis', 'Tuberculosis', 'Infección por Mycobacterium tuberculosis', 'infectologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('infecto-endocarditis', 'Endocarditis Infecciosa', 'Infección de válvulas cardíacas', 'infectologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name, "specialtyId") DO NOTHING;

-- ==============================================================================
-- TEMAS DE BRONCOPULMONAR
-- ==============================================================================

INSERT INTO "topics" ("id", "name", "description", "specialtyId", "createdAt", "updatedAt")
VALUES
  ('bronco-asma', 'Asma Bronquial', 'Enfermedad inflamatoria crónica de las vías aéreas', 'broncopulmonar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bronco-epoc', 'EPOC', 'Enfermedad pulmonar obstructiva crónica', 'broncopulmonar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bronco-neumonia', 'Neumonía', 'Infección del parénquima pulmonar', 'broncopulmonar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bronco-derrame-pleural', 'Derrame Pleural', 'Acumulación de líquido en el espacio pleural', 'broncopulmonar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bronco-neumotorax', 'Neumotórax', 'Presencia de aire en el espacio pleural', 'broncopulmonar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bronco-tep', 'Tromboembolismo Pulmonar', 'Obstrucción de arterias pulmonares', 'broncopulmonar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bronco-cancer-pulmon', 'Cáncer de Pulmón', 'Neoplasias malignas pulmonares', 'broncopulmonar', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name, "specialtyId") DO NOTHING;

-- ==============================================================================
-- TEMAS DE GASTROENTEROLOGÍA
-- ==============================================================================

INSERT INTO "topics" ("id", "name", "description", "specialtyId", "createdAt", "updatedAt")
VALUES
  ('gastro-epigastralgia', 'Epigastralgia y Dispepsia', 'Dolor epigástrico y trastornos digestivos', 'gastroenterologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gastro-ulcera-peptica', 'Úlcera Péptica', 'Úlceras gástricas y duodenales', 'gastroenterologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gastro-enfermedad-inflamatoria', 'Enfermedad Inflamatoria Intestinal', 'Colitis ulcerosa y enfermedad de Crohn', 'gastroenterologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gastro-hepatitis', 'Hepatitis', 'Inflamación del hígado', 'gastroenterologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gastro-cirrosis', 'Cirrosis Hepática', 'Fibrosis hepática avanzada', 'gastroenterologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gastro-hemorragia-digestiva', 'Hemorragia Digestiva', 'Sangrado del tracto gastrointestinal', 'gastroenterologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gastro-diarrea', 'Diarrea', 'Aumento de frecuencia y fluidez de deposiciones', 'gastroenterologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name, "specialtyId") DO NOTHING;

-- ==============================================================================
-- TEMAS DE NEFROLOGÍA
-- ==============================================================================

INSERT INTO "topics" ("id", "name", "description", "specialtyId", "createdAt", "updatedAt")
VALUES
  ('nefro-insuficiencia-renal', 'Insuficiencia Renal', 'Deterioro de la función renal', 'nefrologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('nefro-glomerulonefritis', 'Glomerulonefritis', 'Inflamación de los glomérulos renales', 'nefrologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('nefro-itu', 'Infecciones del Tracto Urinario', 'ITU y pielonefritis', 'nefrologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('nefro-litiasis', 'Litiasis Renal', 'Cálculos renales', 'nefrologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('nefro-sindrome-nefrotico', 'Síndrome Nefrótico', 'Proteinuria, hipoalbuminemia y edema', 'nefrologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('nefro-hipertension-renal', 'Hipertensión Renal', 'Hipertensión secundaria a enfermedad renal', 'nefrologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name, "specialtyId") DO NOTHING;

-- ==============================================================================
-- TEMAS DE NEUROLOGÍA
-- ==============================================================================

INSERT INTO "topics" ("id", "name", "description", "specialtyId", "createdAt", "updatedAt")
VALUES
  ('neuro-avc', 'Accidente Cerebrovascular', 'Ictus isquémico y hemorrágico', 'neurologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('neuro-epilepsia', 'Epilepsia', 'Trastorno convulsivo crónico', 'neurologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('neuro-cefalea', 'Cefalea', 'Dolor de cabeza primario y secundario', 'neurologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('neuro-parkinson', 'Enfermedad de Parkinson', 'Trastorno neurodegenerativo', 'neurologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('neuro-demencia', 'Demencia', 'Deterioro cognitivo progresivo', 'neurologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('neuro-meningitis', 'Meningitis', 'Inflamación de las meninges', 'neurologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('neuro-neuropatias', 'Neuropatías Periféricas', 'Trastornos del sistema nervioso periférico', 'neurologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name, "specialtyId") DO NOTHING;

-- ==============================================================================
-- TEMAS DE PEDIATRÍA GENERAL
-- ==============================================================================

INSERT INTO "topics" ("id", "name", "description", "specialtyId", "createdAt", "updatedAt")
VALUES
  ('pedia-ira', 'Infecciones Respiratorias Altas', 'Resfríos, faringitis, otitis media', 'pediatria-general', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pedia-vacunacion', 'Vacunación', 'Calendario de vacunas infantiles', 'pediatria-general', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pedia-diarrea', 'Diarrea Aguda', 'Gastroenteritis y deshidratación', 'pediatria-general', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pedia-fiebre', 'Fiebre en Pediatría', 'Manejo de la fiebre en niños', 'pediatria-general', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pedia-crecimiento', 'Crecimiento y Desarrollo', 'Evaluación del desarrollo psicomotor', 'pediatria-general', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pedia-neumonia', 'Neumonía Pediátrica', 'Infección respiratoria baja en niños', 'pediatria-general', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name, "specialtyId") DO NOTHING;

-- ==============================================================================
-- TEMAS DE OBSTETRICIA
-- ==============================================================================

INSERT INTO "topics" ("id", "name", "description", "specialtyId", "createdAt", "updatedAt")
VALUES
  ('obst-trabajo-parto', 'Trabajo de Parto y Parto', 'Proceso del nacimiento normal y patológico', 'obstetricia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('obst-control-prenatal', 'Control Prenatal', 'Seguimiento del embarazo normal', 'obstetricia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('obst-hipertension-embarazo', 'Hipertensión en el Embarazo', 'Preeclampsia y eclampsia', 'obstetricia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('obst-diabetes-gestacional', 'Diabetes Gestacional', 'Diabetes durante el embarazo', 'obstetricia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('obst-aborto', 'Aborto', 'Pérdida gestacional temprana', 'obstetricia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('obst-embarazo-ectopico', 'Embarazo Ectópico', 'Implantación fuera del útero', 'obstetricia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('obst-hemorragia-postparto', 'Hemorragia Postparto', 'Sangrado excesivo después del parto', 'obstetricia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name, "specialtyId") DO NOTHING;

-- ==============================================================================
-- TEMAS DE GINECOLOGÍA
-- ==============================================================================

INSERT INTO "topics" ("id", "name", "description", "specialtyId", "createdAt", "updatedAt")
VALUES
  ('gine-metrorragia', 'Metrorragia', 'Sangrado uterino anormal', 'ginecologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gine-amenorrea', 'Amenorrea', 'Ausencia de menstruación', 'ginecologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gine-dismenorrea', 'Dismenorrea', 'Dolor menstrual', 'ginecologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gine-flujo-vaginal', 'Flujo Vaginal', 'Secreciones vaginales patológicas', 'ginecologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gine-cancer-cervical', 'Cáncer Cervical', 'Neoplasia maligna del cuello uterino', 'ginecologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gine-quistes-ovaricos', 'Quistes Ováricos', 'Tumores benignos de ovario', 'ginecologia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name, "specialtyId") DO NOTHING;

-- ==============================================================================
-- TEMAS DE PSIQUIATRÍA
-- ==============================================================================

INSERT INTO "topics" ("id", "name", "description", "specialtyId", "createdAt", "updatedAt")
VALUES
  ('psiq-depresion', 'Trastorno Depresivo', 'Episodio depresivo mayor y trastorno depresivo persistente', 'psiquiatria-clinica', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psiq-esquizofrenia', 'Esquizofrenia', 'Trastorno psicótico crónico', 'psiquiatria-clinica', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psiq-ansiedad', 'Trastornos de Ansiedad', 'Trastorno de ansiedad generalizada y crisis de pánico', 'psiquiatria-clinica', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psiq-bipolar', 'Trastorno Bipolar', 'Episodios maníacos y depresivos', 'psiquiatria-clinica', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psiq-suicidio', 'Conducta Suicida', 'Evaluación y manejo del riesgo suicida', 'psiquiatria-clinica', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('psiq-alcoholismo', 'Trastorno por Uso de Alcohol', 'Dependencia y abuso de alcohol', 'adicciones', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name, "specialtyId") DO NOTHING;

-- ==============================================================================
-- TEMAS DE CIRUGÍA GENERAL
-- ==============================================================================

INSERT INTO "topics" ("id", "name", "description", "specialtyId", "createdAt", "updatedAt")
VALUES
  ('cir-abdomen-agudo', 'Abdomen Agudo', 'Dolor abdominal agudo quirúrgico', 'cirugia-general', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cir-apendicitis', 'Apendicitis', 'Inflamación del apéndice cecal', 'cirugia-general', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cir-colelitiasis', 'Colelitiasis', 'Cálculos vesiculares', 'cirugia-general', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cir-hernia', 'Hernias', 'Hernias inguinales, umbilicales y ventrales', 'cirugia-general', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cir-obstruccion-intestinal', 'Obstrucción Intestinal', 'Bloqueo del tránsito intestinal', 'cirugia-general', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cir-hemorragia-digestiva', 'Hemorragia Digestiva', 'Sangrado gastrointestinal quirúrgico', 'cirugia-general', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name, "specialtyId") DO NOTHING;