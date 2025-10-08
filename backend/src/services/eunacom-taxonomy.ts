/**
 * EUNACOM Medical Taxonomy
 * Comprehensive taxonomy for Chilean medical education
 */

export interface EunacomTaxonomy {
  specialty: string;
  topics: {
    [topic: string]: string[]; // topic: [subtopics]
  };
}

export const EUNACOM_TAXONOMY: EunacomTaxonomy[] = [
  {
    specialty: "Medicina Interna",
    topics: {
      "Cardiología": [
        "Insuficiencia Cardíaca con FE reducida",
        "Insuficiencia Cardíaca con FE preservada",
        "Infarto Agudo al Miocardio",
        "Angina estable e inestable",
        "Arritmias supraventriculares",
        "Arritmias ventriculares",
        "Hipertensión arterial esencial",
        "Hipertensión arterial secundaria",
        "Crisis hipertensiva",
        "Valvulopatías mitral",
        "Valvulopatías aórtica",
        "Pericarditis",
        "Endocarditis",
        "Cardiopatía isquémica"
      ],
      "Neumología": [
        "Neumonía adquirida en comunidad",
        "Neumonía nosocomial",
        "EPOC agudización",
        "EPOC estable",
        "Asma bronquial",
        "Tromboembolismo pulmonar",
        "Derrame pleural",
        "Neumotórax",
        "Insuficiencia respiratoria aguda",
        "Insuficiencia respiratoria crónica"
      ],
      "Gastroenterología": [
        "Enfermedad ácido péptica",
        "Hemorragia digestiva alta",
        "Hemorragia digestiva baja",
        "Enfermedad inflamatoria intestinal",
        "Síndrome de intestino irritable",
        "Hepatitis viral",
        "Cirrosis hepática",
        "Insuficiencia hepática",
        "Colangitis",
        "Pancreatitis aguda",
        "Pancreatitis crónica"
      ],
      "Nefrología": [
        "Insuficiencia renal aguda",
        "Enfermedad renal crónica",
        "Síndrome nefrótico",
        "Síndrome nefrítico",
        "Infección del tracto urinario",
        "Litiasis renal",
        "Trastornos hidroelectrolíticos",
        "Trastornos ácido-base"
      ],
      "Endocrinología": [
        "Diabetes Mellitus tipo 1",
        "Diabetes Mellitus tipo 2",
        "Complicaciones diabéticas agudas",
        "Complicaciones diabéticas crónicas",
        "Trastornos tiroideos - Hipertiroidismo",
        "Trastornos tiroideos - Hipotiroidismo",
        "Trastornos suprarrenales",
        "Trastornos de paratiroides"
      ],
      "Reumatología": [
        "Artritis reumatoide",
        "Lupus eritematoso sistémico",
        "Osteoartritis",
        "Gota",
        "Fibromialgia",
        "Vasculitis"
      ],
      "Hematología": [
        "Anemias carenciales",
        "Anemias hemolíticas",
        "Leucemias",
        "Linfomas",
        "Trastornos de coagulación",
        "Trombocitopenia"
      ]
    }
  },
  {
    specialty: "Cirugía General",
    topics: {
      "Cirugía Abdominal": [
        "Apendicitis aguda",
        "Colecistitis aguda",
        "Colelitiasis",
        "Obstrucción intestinal",
        "Perforación intestinal",
        "Hernias inguinales",
        "Hernias umbilicales",
        "Hernias incisionalmente"
      ],
      "Trauma": [
        "Trauma abdominal cerrado",
        "Trauma abdominal penetrante",
        "Trauma torácico",
        "Trauma craneoencefálico",
        "Fracturas expuestas",
        "Quemaduras"
      ],
      "Cirugía Vascular": [
        "Isquemia arterial aguda",
        "Insuficiencia arterial crónica",
        "Aneurisma aórtico",
        "Trombosis venosa profunda",
        "Úlceras venosas"
      ]
    }
  },
  {
    specialty: "Medicina de Urgencia",
    topics: {
      "Reanimación": [
        "Paro cardiorrespiratorio",
        "Shock cardiogénico",
        "Shock hipovolémico",
        "Shock séptico",
        "Shock anafiláctico"
      ],
      "Toxicología": [
        "Intoxicación por organofosforados",
        "Intoxicación por paracetamol",
        "Intoxicación alcohólica",
        "Intoxicación por monóxido de carbono"
      ],
      "Emergencias Médicas": [
        "Síndrome coronario agudo",
        "Accidente cerebrovascular",
        "Crisis convulsiva",
        "Cetoacidosis diabética",
        "Coma hiperosmolar"
      ]
    }
  },
  {
    specialty: "Ginecología y Obstetricia",
    topics: {
      "Obstetricia": [
        "Control prenatal",
        "Complicaciones del embarazo",
        "Trabajo de parto normal",
        "Distocias",
        "Hemorragia obstétrica",
        "Hipertensión gestacional",
        "Diabetes gestacional"
      ],
      "Ginecología": [
        "Trastornos menstruales",
        "Síndrome de ovario poliquístico",
        "Endometriosis",
        "Miomatosis uterina",
        "Cáncer cervicouterino",
        "Cáncer de ovario",
        "Infecciones genitales"
      ]
    }
  },
  {
    specialty: "Pediatría",
    topics: {
      "Neonatología": [
        "Recién nacido normal",
        "Prematurez",
        "Síndrome de dificultad respiratoria",
        "Sepsis neonatal",
        "Ictericia neonatal"
      ],
      "Pediatría General": [
        "Infecciones respiratorias altas",
        "Neumonía en pediatría",
        "Gastroenteritis aguda",
        "Deshidratación",
        "Fiebre sin foco",
        "Convulsiones febriles"
      ],
      "Crecimiento y Desarrollo": [
        "Desnutrición",
        "Obesidad infantil",
        "Trastornos del desarrollo",
        "Vacunación"
      ]
    }
  },
  {
    specialty: "Psiquiatría",
    topics: {
      "Trastornos del Ánimo": [
        "Episodio depresivo mayor",
        "Trastorno bipolar",
        "Distimia"
      ],
      "Trastornos de Ansiedad": [
        "Trastorno de ansiedad generalizada",
        "Trastorno de pánico",
        "Fobias específicas"
      ],
      "Trastornos Psicóticos": [
        "Esquizofrenia",
        "Trastorno delirante",
        "Episodio psicótico breve"
      ],
      "Emergencias Psiquiátricas": [
        "Ideación suicida",
        "Agitación psicomotora",
        "Delirium"
      ]
    }
  },
  {
    specialty: "Medicina Familiar",
    topics: {
      "Atención Primaria": [
        "Diabetes en atención primaria",
        "Hipertensión en atención primaria",
        "Dislipidemia",
        "Obesidad",
        "Tabaquismo",
        "Alcoholismo"
      ],
      "Prevención": [
        "Screening cáncer de mama",
        "Screening cáncer cervicouterino",
        "Screening cáncer de colon",
        "Screening cardiovascular"
      ]
    }
  }
];

export interface QuestionClassification {
  specialty: string;
  topic: string;
  subtopic?: string;
  confidence: number;
  keywords: string[];
  learningObjectives: string[];
  questionType: 'CLINICAL_CASE' | 'CONCEPT' | 'PROCEDURE' | 'DIAGNOSIS' | 'TREATMENT' | 'PREVENTION';
}

export class EunacomTaxonomyService {
  /**
   * Get all specialties
   */
  static getSpecialties(): string[] {
    return EUNACOM_TAXONOMY.map(spec => spec.specialty);
  }

  /**
   * Get topics for a specialty
   */
  static getTopicsForSpecialty(specialty: string): string[] {
    const spec = EUNACOM_TAXONOMY.find(s => s.specialty === specialty);
    return spec ? Object.keys(spec.topics) : [];
  }

  /**
   * Get subtopics for a specialty and topic
   */
  static getSubtopics(specialty: string, topic: string): string[] {
    const spec = EUNACOM_TAXONOMY.find(s => s.specialty === specialty);
    return spec?.topics[topic] || [];
  }

  /**
   * Find the best taxonomy match for a question
   */
  static classifyQuestion(questionContent: string): QuestionClassification {
    // This will be implemented with AI analysis
    // For now, return a placeholder
    return {
      specialty: "Medicina Interna",
      topic: "Cardiología",
      subtopic: "Insuficiencia Cardíaca con FE reducida",
      confidence: 0.95,
      keywords: ["insuficiencia cardíaca", "fracción eyección", "IECA"],
      learningObjectives: ["Diagnosticar IC con FE reducida", "Iniciar tratamiento óptimo"],
      questionType: 'TREATMENT'
    };
  }
}