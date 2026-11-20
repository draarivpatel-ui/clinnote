/**
 * ClinNote Core Clinical NLP De-Jargonizer, Readability Telemetry,
 * 24-Hour Pharmacokinetic Schedule & Red-Flag Triage Engine.
 * Runs 100% locally in the browser with zero PHI cloud transmission.
 */

export const SUPPORTED_LANGUAGES = ['en', 'es'];

export const DOSING_CLOCK_HOURS = [
  '00:00',
  '06:00',
  '08:00',
  '12:00',
  '14:00',
  '18:00',
  '20:00',
  '22:00'
];

export const COLLISION_TYPES = {
  CRITICAL_CONTRAINDICATION: 'CRITICALCONTRAINDICATION',
  ABSORPTION_CHELATION: 'ABSORPTION_CHELATION',
  RENAL_TRIPLE_WHAMMY: 'RENAL_TRIPLE_WHAMMY',
  SEDATION_STACK: 'SEDATION_STACK',
  DOSE_INTERVAL: 'DOSE_INTERVAL',
  SCHEDULE_CLOCK_COVERAGE: 'SCHEDULE_CLOCK_COVERAGE'
};

export const TRIAGE_DISPOSITIONS = {
  ROUTINE: 'ROUTINE HOME CARE',
  CLINIC: 'SAME-DAY CLINIC CALL',
  EMERGENCY: 'IMMEDIATE EMERGENCY DEPARTMENT'
};

export const CLINICAL_LEXICON = [
  {
    id: 'intercostal-retractions',
    term: 'intercostal retractions',
    pattern: '\\bintercostal\\s+retractions\\b',
    category: 'respiratory-sign',
    en: 'skin pulling in between the ribs when breathing (intercostal retractions)',
    es: 'hundimiento de la piel entre las costillas al respirar (retracciones intercostales)'
  },
  {
    id: 'orthostatic-hypotension',
    term: 'orthostatic hypotension',
    pattern: '\\borthostatic\\s+hypotension\\b',
    category: 'hemodynamic-sign',
    en: 'dizziness from a blood pressure drop when standing up (orthostatic hypotension)',
    es: 'mareo por bajada de presion al ponerse de pie (hipotension ortostatica)'
  },
  {
    id: 'PO',
    term: 'PO',
    pattern: '\\bPO\\b',
    category: 'route',
    en: 'by mouth',
    es: 'por la boca'
  },
  {
    id: 'BID',
    term: 'BID',
    pattern: '\\bBID\\b',
    category: 'frequency',
    en: 'twice a day (morning and evening)',
    es: 'dos veces al dia (manana y tarde)'
  },
  {
    id: 'TID',
    term: 'TID',
    pattern: '\\bTID\\b',
    category: 'frequency',
    en: 'three times a day',
    es: 'tres veces al dia'
  },
  {
    id: 'QID',
    term: 'QID',
    pattern: '\\bQID\\b',
    category: 'frequency',
    en: 'four times a day',
    es: 'cuatro veces al dia'
  },
  {
    id: 'QD',
    term: 'QD',
    pattern: '\\bQD\\b',
    category: 'frequency',
    en: 'once every day',
    es: 'una vez cada dia'
  },
  {
    id: 'QAM',
    term: 'QAM',
    pattern: '\\bQAM\\b',
    category: 'frequency',
    en: 'every morning',
    es: 'cada manana'
  },
  {
    id: 'QHS',
    term: 'QHS',
    pattern: '\\bQHS\\b',
    category: 'frequency',
    en: 'every night at bedtime',
    es: 'cada noche al acostarse'
  },
  {
    id: 'q4h',
    term: 'q4h',
    pattern: '\\bq4h\\b',
    category: 'interval',
    en: 'every 4 hours',
    es: 'cada 4 horas'
  },
  {
    id: 'q6h',
    term: 'q6h',
    pattern: '\\bq6h\\b',
    category: 'interval',
    en: 'every 6 hours',
    es: 'cada 6 horas'
  },
  {
    id: 'q8h',
    term: 'q8h',
    pattern: '\\bq8h\\b',
    category: 'interval',
    en: 'every 8 hours',
    es: 'cada 8 horas'
  },
  {
    id: 'q12h',
    term: 'q12h',
    pattern: '\\bq12h\\b',
    category: 'interval',
    en: 'every 12 hours',
    es: 'cada 12 horas'
  },
  {
    id: 'PRN',
    term: 'PRN',
    pattern: '\\bPRN\\b',
    category: 'conditional',
    en: 'only as needed',
    es: 'solo cuando sea necesario'
  },
  {
    id: 'NPO',
    term: 'NPO',
    pattern: '\\bNPO\\b',
    category: 'dietary',
    en: 'nothing by mouth (no food or drink)',
    es: 'nada por la boca (sin comida ni bebida)'
  },
  {
    id: 'AC',
    term: 'AC',
    pattern: '\\bAC\\b',
    category: 'timing',
    en: 'before meals',
    es: 'antes de comer'
  },
  {
    id: 'PC',
    term: 'PC',
    pattern: '\\bPC\\b',
    category: 'timing',
    en: 'after meals',
    es: 'despues de comer'
  },
  {
    id: 'MDI',
    term: 'MDI',
    pattern: '\\bMDI\\b',
    category: 'device',
    en: 'metered-dose inhaler puff device',
    es: 'inhalador de dosis medida'
  },
  {
    id: 'titrate',
    term: 'titrate',
    pattern: '\\btitrat(?:e|ed|ing|ion)\\b',
    category: 'dosing-action',
    en: 'adjust the dose step by step',
    es: 'ajustar la dosis paso a paso'
  },
  {
    id: 'contraindicated',
    term: 'contraindicated',
    pattern: '\\bcontraindicat(?:ed|ion|ions)\\b',
    category: 'safety',
    en: 'unsafe to combine or use',
    es: 'peligroso de combinar o usar'
  },
  {
    id: 'dyspnea',
    term: 'dyspnea',
    pattern: '\\bdyspnea\\b',
    category: 'respiratory-sign',
    en: 'shortness of breath',
    es: 'falta de aire al respirar'
  },
  {
    id: 'nephrotoxicity',
    term: 'nephrotoxicity',
    pattern: '\\bnephrotoxic(?:ity)?\\b',
    category: 'organ-safety',
    en: 'kidney injury from medication',
    es: 'dano en los rinones por medicamentos'
  },
  {
    id: 'eGFR',
    term: 'eGFR',
    pattern: '\\beGFR\\b',
    category: 'lab-marker',
    en: 'kidney filtration score (eGFR)',
    es: 'puntaje de filtracion renal (eGFR)'
  },
  {
    id: 'HbA1c',
    term: 'HbA1c',
    pattern: '\\bHbA1c\\b',
    category: 'lab-marker',
    en: '3-month average blood sugar (HbA1c)',
    es: 'promedio de azucar en sangre de 3 meses (HbA1c)'
  },
  {
    id: 'SpO2',
    term: 'SpO2',
    pattern: '\\bSpO2\\b',
    category: 'vital-sign',
    en: 'blood oxygen level (SpO2)',
    es: 'nivel de oxigeno en la sangre (SpO2)'
  },
  {
    id: 'melena',
    term: 'melena',
    pattern: '\\bmelena\\b',
    category: 'bleeding-sign',
    en: 'dark tarry stools caused by stomach bleeding',
    es: 'heces negras causadas por sangrado estomacal'
  },
  {
    id: 'hemoptysis',
    term: 'hemoptysis',
    pattern: '\\bhemoptysis\\b',
    category: 'bleeding-sign',
    en: 'coughing up blood',
    es: 'toser sangre'
  },
  {
    id: 'epistaxis',
    term: 'epistaxis',
    pattern: '\\bepistaxis\\b',
    category: 'bleeding-sign',
    en: 'nosebleed that does not stop easily',
    es: 'sangrado de nariz persistente'
  },
  {
    id: 'chelation',
    term: 'chelation',
    pattern: '\\bchelat(?:ion|ing)\\b',
    category: 'pharmacokinetic',
    en: 'mineral binding in the stomach that blocks medicine absorption',
    es: 'union con minerales en el estomago que bloquea el medicamento'
  },
  {
    id: 'postprandial',
    term: 'postprandial',
    pattern: '\\bpostprandial\\b',
    category: 'timing',
    en: 'after eating a meal',
    es: 'despues de comer una comida'
  },
  {
    id: 'hypoglycemia',
    term: 'hypoglycemia',
    pattern: '\\bhypoglycemi(?:a|c)\\b',
    category: 'metabolic-sign',
    en: 'dangerously low blood sugar',
    es: 'azucar baja peligrosa en la sangre'
  },
  {
    id: 'hyperkalemia',
    term: 'hyperkalemia',
    pattern: '\\bhyperkalemi(?:a|c)\\b',
    category: 'metabolic-sign',
    en: 'high potassium level in the blood',
    es: 'nivel alto de potasio en la sangre'
  },
  {
    id: 'bronchospasm',
    term: 'bronchospasm',
    pattern: '\\bbronchospasm\\b',
    category: 'respiratory-sign',
    en: 'sudden tightening of the lung airways',
    es: 'cierre repentino de las vias respiratorias'
  },
  {
    id: 'arthroplasty',
    term: 'arthroplasty',
    pattern: '\\barthroplasty\\b',
    category: 'procedure',
    en: 'joint replacement surgery',
    es: 'cirugia de reemplazo articular'
  },
  {
    id: 'anticoagulation',
    term: 'anticoagulation',
    pattern: '\\banticoagulat(?:ion|ed|ant)\\b',
    category: 'therapy',
    en: 'blood-thinning treatment to prevent clots',
    es: 'tratamiento anticoagulante para prevenir coagulos'
  },
  {
    id: 'malabsorption',
    term: 'malabsorption',
    pattern: '\\bmalabsorption\\b',
    category: 'pharmacokinetic',
    en: 'poor medicine absorption in the stomach',
    es: 'mala absorcion del medicamento en el estomago'
  },
  {
    id: 'subcutaneous',
    term: 'subcutaneous',
    pattern: '\\bsubcutaneous\\b',
    category: 'route',
    en: 'injected just under the skin',
    es: 'inyectado debajo de la piel'
  },
  {
    id: 'syncope',
    term: 'syncope',
    pattern: '\\bsyncope\\b',
    category: 'hemodynamic-sign',
    en: 'fainting or passing out',
    es: 'desmayo o perdida del conocimiento'
  }
];

export const OTC_ADDONS = [
  {
    id: 'otc-ibuprofen',
    nameEn: 'Ibuprofen 400 mg (OTC NSAID)',
    nameEs: 'Ibuprofeno 400 mg (AINE de venta libre)',
    classLabel: 'NSAID Analgesic (Ibuprofen / Naproxen)',
    hours: ['08:00', '14:00', '20:00']
  },
  {
    id: 'otc-calcium-iron',
    nameEn: 'Calcium 600 mg + Iron Supplement',
    nameEs: 'Suplemento de Calcio 600 mg + Hierro',
    classLabel: 'Divalent Cation Mineral Supplement',
    hours: ['06:00', '18:00']
  },
  {
    id: 'otc-diphenhydramine',
    nameEn: 'Diphenhydramine 25 mg (OTC Sleep/Allergy)',
    nameEs: 'Difenidramina 25 mg (Antihistaminico sedante)',
    classLabel: 'First-Generation Sedating Antihistamine',
    hours: ['22:00']
  },
  {
    id: 'otc-grapefruit',
    nameEn: 'Grapefruit Juice (250 mL Morning Glass)',
    nameEs: 'Jugo de Toronja (Vaso matutino de 250 mL)',
    classLabel: 'Intestinal CYP3A4 Enzyme Inhibitor',
    hours: ['08:00']
  }
];

export const CLINICAL_SCENARIOS = [
  {
    id: 'pediatric-asthma-er',
    code: 'ER-PULM-01',
    departmentEn: 'Pediatric Emergency Department Discharge',
    departmentEs: 'Alta de Urgencias Pediatricas',
    titleEn: 'Post-ER Acute Bronchospasm & Oral Corticosteroid Taper',
    titleEs: 'Broncoespasmo Agudo Post-Urgencias y Corticoide Oral',
    patientContextEn: '8-year-old discharged after acute asthma exacerbation stabilization',
    patientContextEs: 'Paciente de 8 anos dado de alta tras estabilizacion de crisis asmatica',
    rawClinicalNote:
      'Discharge after acute bronchospasm stabilization. Administer Albuterol 90 mcg MDI 2 puffs q4h PRN wheezing or dyspnea via valved holding chamber. Administer Prednisone 20 mg PO QD with breakfast x5d; do not abruptly discontinue prior to completion. Monitor pulse oximetry to maintain SpO2 >= 94% on room air. Return to ED immediately for intercostal retractions, persistent dyspnea, cyanosis, or if rescue MDI is required more frequently than q4h.',
    curatedPlainEn:
      'Your child is coming home after treatment for sudden tightening of the lung airways. Give 2 puffs of the Albuterol 90 mcg metered-dose inhaler puff device with a spacer every 4 hours only as needed for wheezing or shortness of breath. Give Prednisone 20 mg by mouth once every day with breakfast for 5 full days to calm lung swelling. Check the finger oxygen sensor so blood oxygen level (SpO2) stays at or above 94%. Go to the Emergency Department right away if you see skin pulling in between the ribs when breathing (intercostal retractions), ongoing shortness of breath, blue lips, or need the rescue inhaler more often than every 4 hours.',
    curatedPlainEs:
      'Su hijo regresa a casa despues de tratar el cierre repentino de las vias respiratorias. De 2 inhalaciones de Albuterol 90 mcg en inhalador de dosis medida con camara espaciadora cada 4 horas solo cuando sea necesario por silbidos o falta de aire al respirar. De Prednisona 20 mg por la boca una vez cada dia con el desayuno durante 5 dias completos para desinflamar los pulmones. Verifique que el nivel de oxigeno en la sangre (SpO2) se mantenga en 94% o mas. Acuda a Urgencias de inmediato si nota hundimiento de la piel entre las costillas al respirar (retracciones intercostales), falta de aire continua, labios morados o si necesita el inhalador en menos de 4 horas.',
    medications: [
      {
        id: 'med-albuterol',
        name: 'Albuterol Sulfate 90 mcg MDI (2 puffs)',
        rawSig: 'Albuterol 90 mcg MDI 2 puffs q4h PRN wheezing',
        plainEn: 'Give 2 inhaler puffs with spacer every 4 hours as needed for wheezing or shortness of breath.',
        plainEs: 'Dar 2 inhalaciones con espaciador cada 4 horas si hay silbidos en el pecho o falta de aire.',
        hours: ['08:00', '12:00', '18:00', '22:00'],
        route: 'Inhaled (MDI + Spacer)',
        purposeEn: 'Quick-relief airway rescue bronchodilator',
        purposeEs: 'Broncodilatador de rescate rapido para abrir vias respiratorias'
      },
      {
        id: 'med-prednisone',
        name: 'Prednisone 20 mg Oral Tablet',
        rawSig: 'Prednisone 20 mg PO QD with breakfast x5d',
        plainEn: 'Take 1 tablet (20 mg) by mouth once every morning with breakfast for 5 days.',
        plainEs: 'Tomar 1 tableta (20 mg) por la boca cada manana con el desayuno por 5 dias.',
        hours: ['08:00'],
        route: 'By mouth (PO) with food',
        purposeEn: '5-day anti-inflammatory lung steroid course',
        purposeEs: 'Ciclo de 5 dias para reducir la inflamacion pulmonar'
      }
    ],
    labsAndVitals: [
      {
        id: 'lab-spo2',
        marker: 'SpO2',
        value: '96%',
        targetRange: '>= 94% Room Air',
        status: 'SAFE',
        plainEn: 'Blood oxygen level is healthy at 96%. Seek emergency care if it drops below 94%.',
        plainEs: 'El nivel de oxigeno en sangre es seguro (96%). Acuda a urgencias si baja de 94%.'
      },
      {
        id: 'lab-resp-rate',
        marker: 'Peak Flow / RR',
        value: '22 breaths/min',
        targetRange: '< 26 breaths/min',
        status: 'CAUTION',
        plainEn: 'Breathing rate is mildly elevated after ER treatment; continue scheduled steroid.',
        plainEs: 'Frecuencia respiratoria levemente elevada tras urgencias; continue el corticoide.'
      }
    ],
    symptoms: [
      {
        id: 'sym-retractions',
        tier: 'EMERGENCY',
        labelEn: 'Skin pulling in between ribs or neck when breathing (intercostal retractions)',
        labelEs: 'Hundimiento de la piel entre las costillas o el cuello al respirar',
        rationaleEn: 'Indicates severe respiratory muscle fatigue and impending airway failure.',
        rationaleEs: 'Indica fatiga respiratoria grave y riesgo de insuficiencia de oxigeno.'
      },
      {
        id: 'sym-spo2-drop',
        tier: 'EMERGENCY',
        labelEn: 'Home pulse oximeter SpO2 reading below 94% or rescue inhaler needed in less than 4 hours',
        labelEs: 'Oximetro en casa con SpO2 menor a 94% o necesidad de inhalador antes de 4 horas',
        rationaleEn: 'Hypoxemia or refractory bronchospasm requires emergency nebulized therapy.',
        rationaleEs: 'Hipoxemia o broncoespasmo refractario requiere tratamiento de emergencia.'
      },
      {
        id: 'sym-night-cough',
        tier: 'CLINIC',
        labelEn: 'Waking up coughing at night despite taking morning Prednisone and 2 puffs of Albuterol',
        labelEs: 'Despertarse tosiendo por la noche a pesar de tomar Prednisona y usar Albuterol',
        rationaleEn: 'Warrants same-day pediatrician call to evaluate controller inhaler step-up.',
        rationaleEs: 'Requiere llamada el mismo dia al pediatra para ajustar el tratamiento.'
      },
      {
        id: 'sym-mild-jitter',
        tier: 'ROUTINE',
        labelEn: 'Mild hand shakiness for 20 minutes after using Albuterol puffs',
        labelEs: 'Temblor leve en las manos durante 20 minutos despues de usar Albuterol',
        rationaleEn: 'Expected beta-agonist side effect that resolves on its own at home.',
        rationaleEs: 'Efecto secundario esperado del inhalador que desaparece solo en casa.'
      }
    ]
  },
  {
    id: 't2d-renal-titration',
    code: 'NEPH-ENDO-02',
    departmentEn: 'Internal Medicine & Nephrology Telemetry Clinic',
    departmentEs: 'Clinica de Medicina Interna y Nefrologia',
    titleEn: 'Type 2 Diabetes & CKD Stage 3a Lab Telemetry',
    titleEs: 'Diabetes Tipo 2 y Telemetria Renal ERC Etapa 3a',
    patientContextEn: '64-year-old adjusting glycemic and renoprotective regimen with Stage 3a CKD',
    patientContextEs: 'Paciente de 64 anos en ajuste metabolico y proteccion renal (ERC Etapa 3a)',
    rawClinicalNote:
      'Type 2 Diabetes Mellitus with CKD Stage 3a baseline telemetry: HbA1c 7.8%, eGFR 52 mL/min/1.73m2, serum K+ 4.9 mEq/L. Continue Metformin ER 500 mg PO BID with meals to minimize postprandial gastrointestinal intolerance. Continue Lisinopril 10 mg PO QD and Empagliflozin 10 mg PO QAM for glycemic and glomerular pressure control. OTC NSAIDs such as Ibuprofen or Naproxen are strictly contraindicated due to acute nephrotoxicity and hyperkalemia risk. Monitor for hypoglycemia or orthostatic hypotension.',
    curatedPlainEn:
      'Your lab results show a 3-month average blood sugar (HbA1c) of 7.8%, a kidney filtration score (eGFR) of 52 (moderate kidney slowdown), and a potassium level of 4.9. Take Metformin ER 500 mg by mouth twice a day (morning and evening) with meals to prevent stomach upset after eating a meal. Take Lisinopril 10 mg by mouth once every day and Empagliflozin 10 mg by mouth every morning to protect your kidneys and blood sugar. Over-the-counter pain relievers like Ibuprofen or Naproxen are unsafe to combine or use because they can cause sudden kidney injury from medication and high potassium level in the blood. Watch for dangerously low blood sugar or dizziness from a blood pressure drop when standing up (orthostatic hypotension).',
    curatedPlainEs:
      'Sus analisis muestran un promedio de azucar en sangre de 3 meses (HbA1c) de 7.8%, un puntaje de filtracion renal (eGFR) de 52 (funcion renal moderada) y potasio en 4.9. Tome Metformina ER 500 mg por la boca dos veces al dia (manana y tarde) con las comidas para cuidar el estomago. Tome Lisinopril 10 mg por la boca una vez cada dia y Empagliflozina 10 mg por la boca cada manana para proteger sus rinones. Los calmantes de venta libre como Ibuprofeno o Naproxeno son peligrosos de combinar o usar porque causan dano en los rinones por medicamentos y nivel alto de potasio en la sangre. Vigile sintomas de azucar baja peligrosa en la sangre o mareo por bajada de presion al ponerse de pie (hipotension ortostatica).',
    medications: [
      {
        id: 'med-metformin',
        name: 'Metformin ER 500 mg Extended-Release Tablet',
        rawSig: 'Metformin ER 500 mg PO BID with meals',
        plainEn: 'Take 1 tablet (500 mg) by mouth twice a day with breakfast and dinner.',
        plainEs: 'Tomar 1 tableta (500 mg) por la boca dos veces al dia con desayuno y cena.',
        hours: ['08:00', '18:00'],
        route: 'By mouth (PO) with meals',
        purposeEn: 'Lowers liver glucose release and improves insulin sensitivity',
        purposeEs: 'Controla el azucar en la sangre durante el dia'
      },
      {
        id: 'med-lisinopril',
        name: 'Lisinopril 10 mg Oral Tablet',
        rawSig: 'Lisinopril 10 mg PO QD',
        plainEn: 'Take 1 tablet (10 mg) by mouth once every morning.',
        plainEs: 'Tomar 1 tableta (10 mg) por la boca una vez cada manana.',
        hours: ['08:00'],
        route: 'By mouth (PO)',
        purposeEn: 'Blood pressure control and kidney filter protection (ACE inhibitor)',
        purposeEs: 'Controla la presion arterial y protege los filtros del rinon'
      },
      {
        id: 'med-empagliflozin',
        name: 'Empagliflozin 10 mg Oral Tablet',
        rawSig: 'Empagliflozin 10 mg PO QAM',
        plainEn: 'Take 1 tablet (10 mg) by mouth every morning with a full glass of water.',
        plainEs: 'Tomar 1 tableta (10 mg) por la boca cada manana con un vaso lleno de agua.',
        hours: ['08:00'],
        route: 'By mouth (PO) in morning',
        purposeEn: 'Removes excess glucose in urine and shields kidney function (SGLT2i)',
        purposeEs: 'Elimina exceso de azucar por la orina y protege el rinon'
      }
    ],
    labsAndVitals: [
      {
        id: 'lab-egfr',
        marker: 'eGFR',
        value: '52 mL/min/1.73m2',
        targetRange: '>= 60 mL/min/1.73m2',
        status: 'CAUTION',
        plainEn: 'Kidney filtration score is 52 (Stage 3a CKD). Avoid NSAIDs (Ibuprofen/Naproxen) and stay hydrated.',
        plainEs: 'Puntaje de filtracion renal en 52 (ERC Etapa 3a). Evite Ibuprofeno o Naproxeno.'
      },
      {
        id: 'lab-hba1c',
        marker: 'HbA1c',
        value: '7.8%',
        targetRange: '< 7.0%',
        status: 'CAUTION',
        plainEn: '3-month average blood sugar is 7.8% (goal under 7.0%). Keep taking morning and evening doses.',
        plainEs: 'Promedio de azucar de 3 meses en 7.8% (meta menor a 7.0%). Continue sus dosis diarias.'
      },
      {
        id: 'lab-potassium',
        marker: 'K+ (Potassium)',
        value: '4.9 mEq/L',
        targetRange: '3.5 to 5.0 mEq/L',
        status: 'CAUTION',
        plainEn: 'Blood potassium is near the upper normal limit (4.9). Avoid potassium salt substitutes and NSAIDs.',
        plainEs: 'Potasio en sangre cerca del limite superior (4.9). Evite sustitutos de sal con potasio.'
      }
    ],
    symptoms: [
      {
        id: 'sym-syncope-hyperk',
        tier: 'EMERGENCY',
        labelEn: 'Fainting (syncope), chest palpitations, or little to no urine output for 12 hours',
        labelEs: 'Desmayo (sincope), palpitaciones en el pecho o casi nada de orina en 12 horas',
        rationaleEn: 'Signs of acute kidney injury or hyperkalemic cardiac conduction instability.',
        rationaleEs: 'Signos de lesion renal aguda o potasio peligrosamente elevado.'
      },
      {
        id: 'sym-hypoglycemia-70',
        tier: 'CLINIC',
        labelEn: 'Home glucometer below 70 mg/dL with cold sweats, shakiness, or orthostatic dizziness',
        labelEs: 'Azucar en casa menor a 70 mg/dL con sudor frio, temblor o mareo al ponerse de pie',
        rationaleEn: 'Take 15g fast-acting carbohydrates, recheck in 15 minutes, and call clinic today.',
        rationaleEs: 'Tome 15g de carbohidratos rapidos, mida en 15 minutos y llame hoy a la clinica.'
      },
      {
        id: 'sym-mild-gi',
        tier: 'ROUTINE',
        labelEn: 'Mild stomach fullness after dinner when taking Metformin ER with food',
        labelEs: 'Sensacion leve de llenura estomacal despues de cenar con Metformina ER',
        rationaleEn: 'Common mild adjustment effect; continue taking tablets with full meals.',
        rationaleEs: 'Efecto leve comun de adaptacion; continue tomando las tabletas con comida.'
      }
    ]
  },
  {
    id: 'postop-anticoag-ortho',
    code: 'ORTHO-COAG-03',
    departmentEn: 'Orthopedic Surgery Post-Arthroplasty Service',
    departmentEs: 'Servicio de Cirugia Ortopedica Post-Artroplastia',
    titleEn: 'Post-Op Knee Arthroplasty & Anticoagulation',
    titleEs: 'Reemplazo de Rodilla Postoperatorio y Anticoagulacion',
    patientContextEn: 'Post-operative day 2 total knee replacement on DVT prophylaxis and multimodal analgesia',
    patientContextEs: 'Dia 2 postoperatorio de reemplazo total de rodilla con profilaxis anticoagulante',
    rawClinicalNote:
      'Post-op total knee arthroplasty DVT prophylaxis and analgesia protocol. Administer Apixaban 2.5 mg PO BID q12h for venous thromboembolism anticoagulation prophylaxis. Administer two immediate-release Acetaminophen 325 mg tablets (650 mg total) PO q6h PRN pain and Oxycodone 5 mg PO q6h PRN severe pain. OTC NSAIDs (Ibuprofen, Naproxen, Aspirin) are strictly contraindicated alongside Apixaban due to major hemorrhage risk. Monitor closely for melena, hemoptysis, or refractory epistaxis.',
    curatedPlainEn:
      'You are recovering from knee joint replacement surgery. Take Apixaban 2.5 mg by mouth twice a day (morning and evening) every 12 hours as blood-thinning treatment to prevent clots. Take two immediate-release Acetaminophen 325 mg tablets (650 mg total) by mouth at least 6 hours apart only as needed for mild-to-moderate pain. Do not exceed 3,000 mg in 24 hours. Take Oxycodone 5 mg by mouth every 6 hours only as needed for severe pain. Over-the-counter NSAID pain relievers (Ibuprofen, Naproxen, Aspirin) are unsafe to combine or use with Apixaban because they can cause dangerous stomach or surgical bleeding. Go to the Emergency Department immediately for dark tarry stools caused by stomach bleeding, coughing up blood, or a nosebleed that does not stop easily.',
    curatedPlainEs:
      'Usted se recupera de una cirugia de reemplazo articular de rodilla. Tome Apixaban 2.5 mg por la boca dos veces al dia (manana y tarde) cada 12 horas como tratamiento anticoagulante para prevenir coagulos. Tome dos tabletas de Acetaminofen de liberacion inmediata de 325 mg (650 mg en total) por la boca con al menos 6 horas entre dosis solo si hay dolor moderado. No exceda 3,000 mg en 24 horas. Tome Oxicodona 5 mg por la boca cada 6 horas solo cuando sea necesario por dolor intenso. Los calmantes AINE de venta libre (Ibuprofeno, Naproxeno, Aspirina) son peligrosos de combinar o usar con Apixaban por alto riesgo de hemorragia. Acuda a Urgencias de inmediato si presenta heces negras causadas por sangrado estomacal, toser sangre o sangrado de nariz persistente.',
    medications: [
      {
        id: 'med-apixaban',
        name: 'Apixaban 2.5 mg Oral Tablet',
        rawSig: 'Apixaban 2.5 mg PO BID q12h',
        plainEn: 'Take 1 tablet (2.5 mg) by mouth twice a day, spaced exactly 12 hours apart (08:00 and 20:00).',
        plainEs: 'Tomar 1 tableta (2.5 mg) por la boca dos veces al dia, cada 12 horas (08:00 y 20:00).',
        hours: ['08:00', '20:00'],
        route: 'By mouth (PO) every 12h',
        purposeEn: 'Factor Xa blood thinner to prevent deep vein blood clots after knee surgery',
        purposeEs: 'Anticoagulante para prevenir coagulos en las venas tras la cirugia'
      },
      {
        id: 'med-acetaminophen',
        name: 'Acetaminophen 650 mg Immediate-Release Dose (two 325 mg tablets)',
        rawSig: 'Acetaminophen immediate-release 325 mg tablets, 2 tablets (650 mg total) PO q6h PRN pain',
        plainEn: 'Take two immediate-release 325 mg tablets (650 mg total) by mouth only as needed for pain, at least 6 hours apart. Do not exceed 3,000 mg in 24 hours.',
        plainEs: 'Tomar dos tabletas de liberacion inmediata de 325 mg (650 mg en total) por la boca solo si hay dolor, con al menos 6 horas entre dosis. Maximo 3,000 mg en 24 horas.',
        hours: ['00:00', '06:00', '12:00', '18:00'],
        route: 'By mouth (PO) q6h PRN',
        purposeEn: 'Baseline non-NSAID pain relief that is safe with blood thinners',
        purposeEs: 'Alivio base del dolor que no afecta la coagulacion'
      },
      {
        id: 'med-oxycodone',
        name: 'Oxycodone IR 5 mg Oral Tablet',
        rawSig: 'Oxycodone 5 mg PO q6h PRN severe pain',
        plainEn: 'Take 1 tablet (5 mg) by mouth every 6 hours only as needed for severe breakthrough pain.',
        plainEs: 'Tomar 1 tableta (5 mg) por la boca cada 6 horas solo si el dolor es severo.',
        hours: ['14:00', '22:00'],
        route: 'By mouth (PO) q6h PRN severe pain',
        purposeEn: 'Short-term opioid rescue analgesia (avoid alcohol and sleep sedatives)',
        purposeEs: 'Analgesico de rescate para dolor fuerte (evitar alcohol y sedantes)'
      }
    ],
    labsAndVitals: [
      {
        id: 'lab-hgb',
        marker: 'Hemoglobin',
        value: '11.4 g/dL',
        targetRange: '>= 10.0 g/dL Post-Op',
        status: 'SAFE',
        plainEn: 'Post-surgery red blood cell count is stable at 11.4 g/dL.',
        plainEs: 'El conteo de hemoglobina tras la cirugia esta estable en 11.4 g/dL.'
      },
      {
        id: 'lab-platelets',
        marker: 'Platelets',
        value: '218 K/uL',
        targetRange: '150 to 400 K/uL',
        status: 'SAFE',
        plainEn: 'Blood clotting cell count is normal while taking Apixaban.',
        plainEs: 'Las plaquetas estan en rango normal mientras toma Apixaban.'
      }
    ],
    symptoms: [
      {
        id: 'sym-melena-hemoptysis',
        tier: 'EMERGENCY',
        labelEn: 'Black tarry stools (melena), coughing up blood (hemoptysis), or sudden calf pain/chest shortness of breath',
        labelEs: 'Heces negras (melena), toser sangre (hemoptisis) o dolor subito en pantorrilla con falta de aire',
        rationaleEn: 'Major anticoagulation hemorrhage or pulmonary embolism requires emergency reversal/workup.',
        rationaleEs: 'Hemorragia mayor o embolia pulmonar requiere atencion de urgencias inmediata.'
      },
      {
        id: 'sym-wound-ooze',
        tier: 'CLINIC',
        labelEn: 'New drainage soaking the knee surgical dressing or persistent epistaxis lasting 15 minutes',
        labelEs: 'Manchado nuevo en el vendaje de la rodilla o sangrado nasal de 15 minutos',
        rationaleEn: 'Contact orthopedic clinic today to inspect surgical incision and review anticoagulation timing.',
        rationaleEs: 'Llame hoy a la clinica ortopedica para revisar la herida y la dosis anticoagulante.'
      },
      {
        id: 'sym-knee-stiffness',
        tier: 'ROUTINE',
        labelEn: 'Mild warmth around the knee joint after completing daily physical therapy exercises',
        labelEs: 'Calor leve alrededor de la rodilla despues de realizar los ejercicios de fisioterapia',
        rationaleEn: 'Expected post-arthroplasty healing response; elevate leg and apply ice pack for 20 minutes.',
        rationaleEs: 'Respuesta normal tras fisioterapia; eleve la pierna y aplique frio por 20 minutos.'
      }
    ]
  },
  {
    id: 'hypertensive-thyroid-sync',
    code: 'CARD-ENDO-04',
    departmentEn: 'Ambulatory Cardiology & Endocrinology Transitions',
    departmentEs: 'Transicion Ambulatoria de Cardiologia y Endocrinologia',
    titleEn: 'Hypertensive Urgency Follow-Up & Morning Absorption Separation',
    titleEs: 'Seguimiento de Urgencia Hipertensiva y Separacion de Absorcion Matutina',
    patientContextEn: '58-year-old synchronizing fasting thyroid replacement, calcium supplementation, and antihypertensive titration',
    patientContextEs: 'Paciente de 58 anos coordinando hormona tiroidea en ayunas, calcio y antihipertensivo',
    rawClinicalNote:
      'Outpatient follow-up after hypertensive urgency and subclinical hypothyroidism evaluation. Administer Levothyroxine 75 mcg PO QAM on empty stomach 60m AC with water only. Titrate Amlodipine 5 mg PO QD for blood pressure control. Administer Calcium Carbonate 600 mg PO BID with meals (lunch and dinner), maintaining >= 4-hour separation from Levothyroxine to prevent divalent cation chelation malabsorption. Monitor home BP for orthostatic hypotension or syncope.',
    curatedPlainEn:
      'You are following up for high blood pressure and low thyroid hormone. Take Levothyroxine 75 mcg by mouth every morning on an empty stomach 60 minutes before meals with plain water only. Adjust the dose step by step with Amlodipine 5 mg by mouth once every day for blood pressure control. Take Calcium Carbonate 600 mg by mouth twice a day (lunch and dinner), keeping at least a 4-hour gap after Levothyroxine to prevent mineral binding in the stomach that blocks medicine absorption and poor medicine absorption in the stomach. Check your blood pressure at home and watch for dizziness from a blood pressure drop when standing up (orthostatic hypotension) or fainting or passing out.',
    curatedPlainEs:
      'Seguimiento por presion arterial alta y tiroides baja. Tome Levotiroxina 75 mcg por la boca cada manana con el estomago vacio 60 minutos antes de comer solo con agua. Continue Amlodipino 5 mg por la boca una vez cada dia para controlar la presion arterial. Tome Carbonato de Calcio 600 mg por la boca dos veces al dia (almuerzo y cena), dejando al menos 4 horas de separacion despues de la Levotiroxina para evitar la union con minerales en el estomago que bloquea el medicamento y la mala absorcion del medicamento en el estomago. Mida su presion en casa y vigile mareo por bajada de presion al ponerse de pie (hipotension ortostatica) o desmayo o perdida del conocimiento.',
    medications: [
      {
        id: 'med-levothyroxine',
        name: 'Levothyroxine Sodium 75 mcg Oral Tablet',
        rawSig: 'Levothyroxine 75 mcg PO QAM on empty stomach 60m AC',
        plainEn: 'Take 1 tablet (75 mcg) at 06:00 on an empty stomach with water, 60 minutes before breakfast.',
        plainEs: 'Tomar 1 tableta (75 mcg) a las 06:00 en ayunas solo con agua, 60 minutos antes de desayunar.',
        hours: ['06:00'],
        route: 'By mouth (PO) fasting 60m AC',
        purposeEn: 'Thyroid hormone replacement (strictly separate from Calcium/Iron by >= 4 hours)',
        purposeEs: 'Hormona tiroidea (separar al menos 4 horas de suplementos de Calcio o Hierro)'
      },
      {
        id: 'med-amlodipine',
        name: 'Amlodipine Besylate 5 mg Oral Tablet',
        rawSig: 'Amlodipine 5 mg PO QD',
        plainEn: 'Take 1 tablet (5 mg) by mouth once every morning at 08:00 with breakfast.',
        plainEs: 'Tomar 1 tableta (5 mg) por la boca cada manana a las 08:00 con el desayuno.',
        hours: ['08:00'],
        route: 'By mouth (PO) once daily',
        purposeEn: 'Calcium-channel blocker to relax blood vessels and lower blood pressure',
        purposeEs: 'Relaja los vasos sanguineos para mantener la presion arterial segura'
      },
      {
        id: 'med-calcium-rx',
        name: 'Calcium Carbonate 600 mg Oral Tablet',
        rawSig: 'Calcium Carbonate 600 mg PO BID with meals (lunch and dinner)',
        plainEn: 'Take 1 tablet (600 mg) at 12:00 lunch and 18:00 dinner (>= 6 hours after 06:00 Levothyroxine).',
        plainEs: 'Tomar 1 tableta (600 mg) a las 12:00 con almuerzo y 18:00 con cena (6 horas despues de Levotiroxina).',
        hours: ['12:00', '18:00'],
        route: 'By mouth (PO) with lunch & dinner',
        purposeEn: 'Bone mineral support spaced safely away from morning thyroid medication',
        purposeEs: 'Soporte oseo separado de la toma matutina de tiroides'
      }
    ],
    labsAndVitals: [
      {
        id: 'lab-bp',
        marker: 'Seated BP',
        value: '134/82 mmHg',
        targetRange: '< 130/80 mmHg',
        status: 'CAUTION',
        plainEn: 'Blood pressure is improving (134/82) down from hypertensive urgency; continue daily Amlodipine.',
        plainEs: 'La presion arterial ha mejorado (134/82); continue tomando Amlodipino a diario.'
      },
      {
        id: 'lab-tsh',
        marker: 'TSH',
        value: '6.4 mIU/L',
        targetRange: '0.45 to 4.50 mIU/L',
        status: 'CAUTION',
        plainEn: 'Thyroid stimulating hormone is 6.4 (slightly underactive thyroid). Fasting absorption is key.',
        plainEs: 'Hormona TSH en 6.4 (tiroides levemente lenta). Es clave tomar la pastilla en ayunas.'
      }
    ],
    symptoms: [
      {
        id: 'sym-htn-emergency',
        tier: 'EMERGENCY',
        labelEn: 'Home blood pressure above 180/120 mmHg with chest pain, vision changes, or syncope',
        labelEs: 'Presion arterial mayor a 180/120 mmHg con dolor de pecho, vision borrosa o desmayo',
        rationaleEn: 'Hypertensive crisis with end-organ symptoms requires immediate emergency department care.',
        rationaleEs: 'Crisis hipertensiva con sintomas de alarma requiere acudir a Urgencias de inmediato.'
      },
      {
        id: 'sym-orthostatic-ankle',
        tier: 'CLINIC',
        labelEn: 'Dizzy spells when standing up (orthostatic hypotension) or new bilateral ankle swelling',
        labelEs: 'Mareos al levantarse (hipotension ortostatica) o hinchazon nueva en ambos tobillos',
        rationaleEn: 'Call clinic today to review Amlodipine dose titration and standing blood pressure.',
        rationaleEs: 'Llame hoy a la clinica para revisar el ajuste de dosis de Amlodipino.'
      },
      {
        id: 'sym-mild-flushing',
        tier: 'ROUTINE',
        labelEn: 'Mild facial warmth during the first week of Amlodipine therapy with normal BP readings',
        labelEs: 'Calor facial leve durante la primera semana de Amlodipino con presion normal',
        rationaleEn: 'Benign vasodilation effect that typically fades after several days.',
        rationaleEs: 'Efecto leve de dilatacion vascular que suele desaparecer en pocos dias.'
      }
    ]
  }
];

export function getScenarioById(scenarioId) {
  const found = CLINICAL_SCENARIOS.find((item) => item.id === scenarioId);
  if (found !== undefined) {
    return found;
  }
  return CLINICAL_SCENARIOS[0];
}

export function countWordSyllables(rawWord) {
  if (typeof rawWord !== 'string') {
    return 1;
  }
  const cleaned = rawWord.toLowerCase().replace(/[^a-z]/g, '');
  if (cleaned.length === 0) {
    return 1;
  }
  if (cleaned.length <= 3) {
    return 1;
  }
  const withoutSilentE = cleaned.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  const withoutLeadingY = withoutSilentE.replace(/^y/, '');
  const vowelClusters = withoutLeadingY.match(/[aeiouy]{1,2}/g);
  if (vowelClusters === null) {
    return 1;
  }
  return vowelClusters.length;
}

export function detectJargonMatches(text, lang = 'en') {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return [];
  }
  const safeLang = lang === 'es' ? 'es' : 'en';
  const matches = [];

  for (const entry of CLINICAL_LEXICON) {
    const regex = new RegExp(entry.pattern, 'gi');
    const found = text.match(regex);
    if (found !== null) {
      matches.push({
        id: entry.id,
        term: entry.term,
        category: entry.category,
        occurrences: found.length,
        plainReplacement: entry[safeLang]
      });
    }
  }
  return matches;
}

/**
 * Provenance: every lexicon hit as an exact character span of the source text.
 * Uses the same patterns as detectJargonMatches, so the span count per term equals
 * that term's `occurrences`. `text.slice(start, end)` is always the matched surface form.
 */
export function locateJargonSpans(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return [];
  }
  const spans = [];
  for (const entry of CLINICAL_LEXICON) {
    const regex = new RegExp(entry.pattern, 'gi');
    let m = regex.exec(text);
    while (m !== null) {
      spans.push({
        id: entry.id,
        term: entry.term,
        category: entry.category,
        start: m.index,
        end: m.index + m[0].length,
        text: m[0],
        negated: isNegatedContext(text, m.index, m[0].length)
      });
      if (m[0].length === 0) regex.lastIndex += 1;
      m = regex.exec(text);
    }
  }
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  return spans;
}

export function computeReadabilityMetrics(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return {
      wordCount: 0,
      sentenceCount: 0,
      syllableCount: 0,
      syllablesPerWord: 0,
      wordsPerSentence: 0,
      fleschKincaidGrade: 0,
      jargonCount: 0
    };
  }

  const trimmed = text.trim();
  const rawSentences = trimmed
    .replace(/(\d)\.(?=\d)/g, '$1')
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = rawSentences.length >= 1 ? rawSentences.length : 1;

  const words = trimmed
    .split(/\s+/)
    .map((w) => w.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ''))
    .filter((w) => w.length > 0);

  const wordCount = words.length;
  if (wordCount === 0) {
    return {
      wordCount: 0,
      sentenceCount: 0,
      syllableCount: 0,
      syllablesPerWord: 0,
      wordsPerSentence: 0,
      fleschKincaidGrade: 0,
      jargonCount: 0
    };
  }

  let syllableCount = 0;
  for (const word of words) {
    syllableCount += countWordSyllables(word);
  }

  const detectedJargon = detectJargonMatches(trimmed, 'en');
  let jargonCount = 0;
  for (const item of detectedJargon) {
    jargonCount += item.occurrences;
  }

  const wordsPerSentence = wordCount / sentenceCount;
  const syllablesPerWord = syllableCount / wordCount;
  const rawGrade =
    0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;

  return {
    wordCount,
    sentenceCount,
    syllableCount,
    syllablesPerWord,
    wordsPerSentence,
    fleschKincaidGrade: rawGrade,
    jargonCount
  };
}

/** Measure the exact source and output strings. The grade is an English-language estimate. */
export function analyzeClinicalTransformation(rawText, translatedText, lang = 'en') {
  const safeLang = lang === 'es' ? 'es' : 'en';
  const original = typeof rawText === 'string' ? rawText : '';
  const output = typeof translatedText === 'string' ? translatedText : '';
  const beforeMetrics = computeReadabilityMetrics(original);
  const afterMetrics = computeReadabilityMetrics(output);
  const gradeBefore = beforeMetrics.fleschKincaidGrade;
  const gradeAfter = afterMetrics.fleschKincaidGrade;
  // This is a signed change in the formula score, never measured comprehension.
  // A percentage is only meaningful for a positive starting grade.
  const clarityGainPct = gradeBefore > 0
    ? Math.round((gradeBefore - gradeAfter) / gradeBefore * 100)
    : null;
  return {
    originalText: original,
    translatedText: output,
    lang: safeLang,
    matchedTerms: detectJargonMatches(original, safeLang),
    jargonCountBefore: beforeMetrics.jargonCount,
    jargonCountAfter: afterMetrics.jargonCount,
    beforeMetrics,
    afterMetrics,
    gradeBefore,
    gradeAfter,
    clarityGainPct
  };
}

export function dejargonizeClinicalText(rawText, lang = 'en') {
  const safeLang = lang === 'es' ? 'es' : 'en';
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    return analyzeClinicalTransformation('', '', safeLang);
  }

  let translatedText = rawText;
  for (const entry of CLINICAL_LEXICON) {
    translatedText = translatedText.replace(new RegExp(entry.pattern, 'gi'), entry[safeLang]);
  }

  if (safeLang === 'es') {
    translatedText = translatedText
      .replace(/\bwith breakfast\b/gi, 'con el desayuno')
      .replace(/\bwith meals\b/gi, 'con las comidas')
      .replace(/\bon empty stomach\b/gi, 'con el estomago vacio')
      .replace(/\bsevere pain\b/gi, 'por dolor intenso')
      .replace(/\bpain\b/gi, 'por dolor')
      .replace(/\bwheezing\b/gi, 'silbidos al respirar')
      .replace(/\b2 puffs\b/gi, '2 inhalaciones');
  }

  return analyzeClinicalTransformation(rawText, translatedText, safeLang);
}

function clockMinutes(hour) {
  const match = typeof hour === 'string' && /^(\d{2}):(\d{2})$/.exec(hour);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Check listed doses, including the interval to the next day's first dose. */
export function inspectMedicationIntervals(medications, clockHours = DOSING_CLOCK_HOURS) {
  const checks = [];
  const violations = [];
  const clock = new Set(clockHours);
  for (const med of medications) {
    const scheduledHours = Array.isArray(med.hours) ? med.hours : [];
    const minutes = scheduledHours.map(clockMinutes);
    const hiddenHours = scheduledHours.filter((hour, i) => minutes[i] === null || !clock.has(hour));
    if (hiddenHours.length) {
      violations.push({ medicationId: med.id, code: COLLISION_TYPES.SCHEDULE_CLOCK_COVERAGE, hours: hiddenHours });
    }
    const sig = typeof med.rawSig === 'string' && /\bq(\d+(?:\.\d+)?)h\b/i.exec(med.rawSig);
    if (!sig) continue;
    const minimumIntervalHours = Number(sig[1]);
    const ordered = scheduledHours
      .map((hour, i) => ({ hour, minute: minutes[i] }))
      .filter((x) => x.minute !== null)
      .sort((a, b) => a.minute - b.minute);
    const gapsHours = ordered.map((dose, i) => {
      const next = ordered[(i + 1) % ordered.length];
      const gap = (next.minute + (i === ordered.length - 1 ? 1440 : 0) - dose.minute) / 60;
      if (gap < minimumIntervalHours) {
        violations.push({
          medicationId: med.id, code: COLLISION_TYPES.DOSE_INTERVAL,
          hours: [dose.hour, next.hour], minimumIntervalHours, gapHours: gap
        });
      }
      return gap;
    });
    checks.push({
      medicationId: med.id, minimumIntervalHours, scheduledHours: [...scheduledHours], gapsHours,
      valid: hiddenHours.length === 0 && ordered.length > 0 && gapsHours.every((gap) => gap >= minimumIntervalHours)
    });
    if (!ordered.length) {
      violations.push({ medicationId: med.id, code: COLLISION_TYPES.SCHEDULE_CLOCK_COVERAGE, hours: [] });
    }
  }
  return { checks, violations };
}

export function buildMedicationScheduleAndCollisions(
  scenarioId,
  activeOtcIds = [],
  lang = 'en'
) {
  const isEs = lang === 'es';
  const safeLang = isEs ? 'es' : 'en';
  const scenario = getScenarioById(scenarioId);
  const otcSet = new Set(Array.isArray(activeOtcIds) ? activeOtcIds : []);
  const selectedOtcs = OTC_ADDONS.filter((otc) => otcSet.has(otc.id));

  const slots = DOSING_CLOCK_HOURS.map((hour) => {
    const rxItems = scenario.medications
      .filter((med) => med.hours.includes(hour))
      .map((med) => ({
        id: med.id,
        name: med.name,
        kind: 'RX',
        route: med.route,
        instruction: isEs ? med.plainEs : med.plainEn
      }));

    const otcItems = selectedOtcs
      .filter((otc) => otc.hours.includes(hour))
      .map((otc) => ({
        id: otc.id,
        name: isEs ? otc.nameEs : otc.nameEn,
        kind: 'OTC',
        route: otc.classLabel,
        instruction: isEs
          ? 'Suplemento o medicamento de venta libre seleccionado para simulacion'
          : 'User-toggled over-the-counter add-on selected for safety check'
      }));

    return {
      hour,
      items: [...rxItems, ...otcItems],
      hasCollision: false,
      collisionCodes: []
    };
  });

  const intervalInspection = inspectMedicationIntervals(scenario.medications);
  const collisions = intervalInspection.violations.map((issue) => ({
    code: issue.code,
    severityScore: 95,
    severityBand: 'CRITICAL',
    collisionHours: issue.hours,
    involvedAgents: [scenario.medications.find((med) => med.id === issue.medicationId).name],
    title: isEs ? 'Horario de dosis inseguro' : 'Unsafe dose schedule',
    explanation: issue.code === COLLISION_TYPES.DOSE_INTERVAL
      ? (isEs
        ? 'El horario tiene dosis con menos horas de separacion de las que indica la receta.'
        : 'The listed doses are closer together than the prescription minimum interval, including overnight.')
      : (isEs
        ? 'Una hora de dosis falta en el reloj o no es valida.'
        : 'A listed dose time is invalid or missing from the displayed clock.'),
    actionDirective: isEs
      ? 'No siga este horario. Pida al medico o farmaceutico que confirme las horas antes de tomar la siguiente dosis.'
      : 'Do not follow this schedule. Ask the prescriber or pharmacist to confirm the times before the next dose.'
  }));

  // 1. Apixaban + Ibuprofen / NSAID -> CRITICALCONTRAINDICATION
  if (scenario.id === 'postop-anticoag-ortho' && otcSet.has('otc-ibuprofen')) {
    collisions.push({
      code: COLLISION_TYPES.CRITICAL_CONTRAINDICATION,
      aliasCode: 'CRITICAL_CONTRAINDICATION',
      severityScore: 98,
      severityBand: 'CRITICAL',
      collisionHours: ['08:00', '20:00'],
      involvedAgents: ['Apixaban 2.5 mg PO BID', 'Ibuprofen 400 mg OTC NSAID'],
      title: isEs
        ? 'Contraindicacion Critica: Anticoagulante + AINE (Riesgo de Hemorragia Mayor)'
        : 'Critical Contraindication: Apixaban + OTC Ibuprofen (Major Bleeding Risk)',
      explanation: isEs
        ? 'El Ibuprofeno inhibe la agregacion plaquetaria y erosiona la mucosa gastrica mientras Apixaban bloquea el Factor Xa, multiplicando el riesgo de sangrado gastrointestinal o en la rodilla operada.'
        : 'Ibuprofen blocks platelet clotting and irritates the stomach lining while Apixaban inhibits Factor Xa, more than doubling the risk of severe stomach or surgical-site hemorrhage.',
      actionDirective: isEs
        ? 'NO tome Ibuprofeno, Naproxeno ni Aspirina. Use Acetaminofen segun lo recetado.'
        : 'DO NOT take Ibuprofen, Naproxen, or Aspirin. Use prescribed Acetaminophen for pain.'
    });
  }

  // 2. Lisinopril + Empagliflozin + Ibuprofen in CKD Stage 3a -> RENAL_TRIPLE_WHAMMY
  if (scenario.id === 't2d-renal-titration' && otcSet.has('otc-ibuprofen')) {
    collisions.push({
      code: COLLISION_TYPES.RENAL_TRIPLE_WHAMMY,
      aliasCode: COLLISION_TYPES.CRITICAL_CONTRAINDICATION,
      severityScore: 94,
      severityBand: 'CRITICAL',
      collisionHours: ['08:00'],
      involvedAgents: [
        'Lisinopril 10 mg (ACEi)',
        'Empagliflozin 10 mg (SGLT2i)',
        'Ibuprofen 400 mg (NSAID)'
      ],
      title: isEs
        ? 'Peligro Renal (Triple Whammy): Lisinopril + Empagliflozina + Ibuprofeno con eGFR 52'
        : 'Renal Triple-Whammy Hazard: Lisinopril + Empagliflozin + Ibuprofen with eGFR 52',
      explanation: isEs
        ? 'El Ibuprofeno contrae la arteriola aferente renal mientras Lisinopril y Empagliflozina reducen la presion glomerular en un rinon con eGFR 52, pudiendo causar insuficiencia renal aguda e hiperpotasemia.'
        : 'Ibuprofen constricts inflow blood vessels to the kidney while Lisinopril and Empagliflozin lower filtration pressure in Stage 3a CKD (eGFR 52), risking acute kidney injury and dangerous hyperkalemia.',
      actionDirective: isEs
        ? 'Suspenda Ibuprofeno/Naproxeno inmediatamente; consulte a su medico para alivio seguro del dolor.'
        : 'Avoid all OTC NSAIDs (Ibuprofen/Naproxen); ask your clinician about kidney-safe pain options.'
    });
  }

  // 3. Levothyroxine + Morning Calcium/Iron -> ABSORPTION_CHELATION
  if (scenario.id === 'hypertensive-thyroid-sync' && otcSet.has('otc-calcium-iron')) {
    collisions.push({
      code: COLLISION_TYPES.ABSORPTION_CHELATION,
      aliasCode: 'ABSORPTION_CHELATION',
      severityScore: 84,
      severityBand: 'HIGH',
      collisionHours: ['06:00'],
      involvedAgents: [
        'Levothyroxine 75 mcg (06:00 Fasting)',
        'Calcium 600 mg + Iron Supplement (06:00)'
      ],
      title: isEs
        ? 'Quelacion de Absorcion a las 06:00: Levotiroxina + Calcio/Hierro (< 4 Horas)'
        : '06:00 Morning Chelation Collision: Levothyroxine + Calcium/Iron (< 4h Separation)',
      explanation: isEs
        ? 'El calcio y el hierro se unen quimicamente (quelacion) a la Levotiroxina en el estomago, formando un complejo insoluble que impide que la hormona tiroidea pase a la sangre.'
        : 'Calcium and iron ions bind directly to Levothyroxine in the stomach (chelation), forming an insoluble complex that blocks thyroid hormone absorption and keeps TSH elevated.',
      actionDirective: isEs
        ? 'Tome Levotiroxina sola con agua a las 06:00 y mueva todo suplemento de Calcio o Hierro al menos a las 12:00.'
        : 'Take Levothyroxine alone with water at 06:00 and separate Calcium or Iron supplements by at least 4 hours (12:00 or later).'
    });
  }

  // 4. Oxycodone + Diphenhydramine -> SEDATION_STACK (or pediatric asthma airway drying / sedation)
  if (otcSet.has('otc-diphenhydramine')) {
    if (scenario.id === 'postop-anticoag-ortho') {
      collisions.push({
        code: COLLISION_TYPES.SEDATION_STACK,
        aliasCode: 'SEDATION_STACK',
        severityScore: 88,
        severityBand: 'HIGH',
        collisionHours: ['22:00'],
        involvedAgents: [
          'Oxycodone 5 mg PO (22:00)',
          'Diphenhydramine 25 mg OTC Sedative (22:00)'
        ],
        title: isEs
          ? 'Acumulacion de Sedacion (22:00): Oxicodona + Difenidramina'
          : '22:00 CNS Sedation Stack: Oxycodone + OTC Diphenhydramine',
        explanation: isEs
          ? 'Combinar un opioide (Oxicodona) con un antihistaminico sedante (Difenidramina) a las 22:00 duplica la depresion del sistema nervioso central, aumentando el riesgo de caidas nocturnas y respiracion lenta.'
          : 'Combining an opioid analgesic (Oxycodone) with a sedating antihistamine (Diphenhydramine) at 22:00 compounds central nervous system depression, raising fall risk on a new knee and slowing nighttime breathing.',
        actionDirective: isEs
          ? 'No combine pastillas para dormir ni antihistaminicos sedantes mientras tome Oxicodona.'
          : 'Do not take OTC sleep aids or sedating allergy pills while taking prescribed Oxycodone.'
      });
    } else {
      collisions.push({
        code: COLLISION_TYPES.SEDATION_STACK,
        aliasCode: 'SEDATION_STACK',
        severityScore: 68,
        severityBand: 'MODERATE',
        collisionHours: ['22:00'],
        involvedAgents: ['Evening Regimen', 'Diphenhydramine 25 mg OTC Sedative (22:00)'],
        title: isEs
          ? 'Alerta de Sedacion y Mareo Nocturno: Difenidramina 25 mg'
          : 'Anticholinergic & Nighttime Dizziness Alert: OTC Diphenhydramine 25 mg',
        explanation: isEs
          ? 'La Difenidramina reseca las secreciones bronquiales en el asma y aumenta el mareo ortostatico al levantarse por la noche.'
          : 'Diphenhydramine thickens bronchial mucus in asthma recovery and worsens nighttime orthostatic dizziness when standing.',
        actionDirective: isEs
          ? 'Evite antihistaminicos sedantes de primera generacion salvo indicacion medica.'
          : 'Avoid first-generation sedating antihistamines unless specifically directed by your physician.'
      });
    }
  }

  // 5. Grapefruit Juice CYP3A4 interaction with Apixaban / Oxycodone / Amlodipine
  if (otcSet.has('otc-grapefruit')) {
    if (
      scenario.id === 'postop-anticoag-ortho' ||
      scenario.id === 'hypertensive-thyroid-sync'
    ) {
      collisions.push({
        code: COLLISION_TYPES.CRITICAL_CONTRAINDICATION,
        aliasCode: 'CYP3A4_INHIBITION',
        severityScore: 79,
        severityBand: 'HIGH',
        collisionHours: ['08:00'],
        involvedAgents:
          scenario.id === 'postop-anticoag-ortho'
            ? ['Apixaban / Oxycodone', 'Grapefruit Juice (CYP3A4 Inhibitor)']
            : ['Amlodipine 5 mg PO', 'Grapefruit Juice (CYP3A4 Inhibitor)'],
        title: isEs
          ? 'Inhibicion Enzimatica CYP3A4: Jugo de Toronja Eleva Niveles del Medicamento'
          : 'CYP3A4 Metabolic Inhibition: Grapefruit Juice Spikes Drug Blood Levels',
        explanation: isEs
          ? 'El jugo de toronja bloquea la enzima intestinal CYP3A4, acumulando niveles excesivos de Amlodipino, Apixaban u Oxicodona en la sangre.'
        : 'Grapefruit juice blocks intestinal CYP3A4 enzymes, causing higher-than-intended blood levels of Amlodipine, Apixaban, or Oxycodone.',
        actionDirective: isEs
          ? 'Tome sus medicamentos con agua simple y evite el jugo de toronja.'
          : 'Take morning medications with plain water and avoid grapefruit juice.'
      });
    }
  }

  // 6. Prednisone + Ibuprofen GI ulceration risk in pediatric-asthma-er
  if (scenario.id === 'pediatric-asthma-er' && otcSet.has('otc-ibuprofen')) {
    collisions.push({
      code: COLLISION_TYPES.CRITICAL_CONTRAINDICATION,
      aliasCode: 'GI_STEROID_NSAID_STACK',
      severityScore: 76,
      severityBand: 'HIGH',
      collisionHours: ['08:00'],
      involvedAgents: ['Prednisone 20 mg PO QD', 'Ibuprofen 400 mg OTC NSAID'],
      title: isEs
        ? 'Irritacion Gastrica Combinada: Prednisona + Ibuprofeno a las 08:00'
        : 'Additive Gastric Irritation & Aspirin-Sensitive Asthma Risk: Prednisone + Ibuprofen',
      explanation: isEs
        ? 'Combinar un corticoide oral (Prednisona) con un AINE (Ibuprofeno) irrita la mucosa del estomago y en algunos pacientes asmaticos los AINE pueden desencadenar broncoespasmo.'
        : 'Combining oral corticosteroids (Prednisone) with an NSAID (Ibuprofen) increases stomach lining irritation, and NSAIDs can trigger bronchospasm in sensitive asthma patients.',
      actionDirective: isEs
        ? 'Evite Ibuprofeno durante el ciclo de Prednisona salvo aprobacion del pediatra.'
        : 'Avoid OTC Ibuprofen during the 5-day Prednisone course unless cleared by the pediatrician.'
    });
  }

  for (const slot of slots) {
    const matchingCollisions = collisions.filter((c) =>
      c.collisionHours.includes(slot.hour)
    );
    if (matchingCollisions.length >= 1) {
      slot.hasCollision = true;
      slot.collisionCodes = matchingCollisions.map((c) => c.code);
    }
  }

  let maxSeverityScore = 0;
  for (const c of collisions) {
    if (c.severityScore >= maxSeverityScore) {
      maxSeverityScore = c.severityScore;
    }
  }

  const overallSafetyBand =
    maxSeverityScore >= 90
      ? 'CRITICAL'
      : maxSeverityScore >= 70
      ? 'HIGH'
      : maxSeverityScore >= 40
      ? 'MODERATE'
      : 'SAFE';

  return {
    scenarioId: scenario.id,
    lang: safeLang,
    slots,
    collisions,
    collisionCount: collisions.length,
    intervalChecks: intervalInspection.checks,
    maxSeverityScore,
    overallSafetyBand
  };
}

export function evaluateSymptomTriage(
  scenarioId,
  selectedSymptomIds = [],
  lang = 'en'
) {
  const isEs = lang === 'es';
  const safeLang = isEs ? 'es' : 'en';
  const scenario = getScenarioById(scenarioId);
  const selectedSet = new Set(
    Array.isArray(selectedSymptomIds) ? selectedSymptomIds : []
  );

  const activeSymptoms = scenario.symptoms.filter((sym) =>
    selectedSet.has(sym.id)
  );

  let hasEmergency = false;
  let hasClinic = false;

  for (const sym of activeSymptoms) {
    if (sym.tier === 'EMERGENCY') {
      hasEmergency = true;
    } else if (sym.tier === 'CLINIC') {
      hasClinic = true;
    }
  }

  if (hasEmergency === true) {
    return {
      disposition: TRIAGE_DISPOSITIONS.EMERGENCY,
      urgencyScore: 95,
      tone: 'critical',
      activeSymptomCount: activeSymptoms.length,
      headline: isEs
        ? 'ACUDA AL DEPARTAMENTO DE URGENCIAS DE INMEDIATO (O LLAME AL 911)'
        : 'IMMEDIATE EMERGENCY DEPARTMENT EVALUATION REQUIRED',
      rationale: isEs
        ? activeSymptoms.map((s) => s.rationaleEs).join(' ')
        : activeSymptoms.map((s) => s.rationaleEn).join(' '),
      actionSteps: isEs
        ? 'No conduzca usted mismo si tiene mareo, falta de aire o sangrado. Lleve su lista de medicamentos al hospital.'
        : 'Do not wait for a clinic callback. Bring this medication schedule and go to the nearest Emergency Department or call 911.'
    };
  }

  if (hasClinic === true) {
    return {
      disposition: TRIAGE_DISPOSITIONS.CLINIC,
      urgencyScore: 62,
      tone: 'caution',
      activeSymptomCount: activeSymptoms.length,
      headline: isEs
        ? 'LLAME HOY MISMO A SU CLINICA O MEDICO TRATANTE'
        : 'SAME-DAY CLINIC CALL RECOMMENDED',
      rationale: isEs
        ? activeSymptoms.map((s) => s.rationaleEs).join(' ')
        : activeSymptoms.map((s) => s.rationaleEn).join(' '),
      actionSteps: isEs
        ? 'Comuniquese hoy con la linea de enfermeria de su clinica para ajustar su tratamiento antes de la siguiente dosis.'
        : 'Call your discharging clinic or on-call nurse today so your physician can review your readings and adjust dosing if needed.'
    };
  }

  return {
    disposition: TRIAGE_DISPOSITIONS.ROUTINE,
    urgencyScore: activeSymptoms.length >= 1 ? 24 : 10,
    tone: 'safe',
    activeSymptomCount: activeSymptoms.length,
    headline: isEs
      ? 'CUIDADO HABITUAL EN CASA: CONTINUE SU HORARIO INDICADO'
      : 'ROUTINE HOME CARE: CONTINUE SCHEDULED RECOVERY PLAN',
    rationale:
      activeSymptoms.length >= 1
        ? isEs
          ? activeSymptoms.map((s) => s.rationaleEs).join(' ')
          : activeSymptoms.map((s) => s.rationaleEn).join(' ')
        : isEs
        ? 'Ningun sintoma de alarma seleccionado. Continue tomando sus medicamentos en las horas indicadas.'
        : 'No warning symptoms selected. Continue taking your medications at the scheduled clock hours.',
    actionSteps: isEs
      ? 'Mantenga esta hoja en su refrigerador y vuelva a verificar si aparece algun sintoma nuevo.'
      : 'Keep your printed schedule on the refrigerator and re-check this triage guide if new symptoms develop.'
  };
}

export function createInitialAppState() {
  return {
    scenarioId: CLINICAL_SCENARIOS[0].id,
    lang: 'en',
    customText: '',
    activeOtcIds: [],
    selectedSymptomIds: []
  };
}

export function applyAppAction(state, action) {
  const current = state || createInitialAppState();
  if (!action || typeof action.type !== 'string') {
    return current;
  }

  if (action.type === 'SELECT_SCENARIO') {
    const scenario = getScenarioById(action.scenarioId);
    return {
      ...current,
      scenarioId: scenario.id,
      customText: '',
      activeOtcIds: [],
      selectedSymptomIds: []
    };
  }

  if (action.type === 'SET_LANGUAGE') {
    const nextLang = action.lang === 'es' ? 'es' : 'en';
    return {
      ...current,
      lang: nextLang
    };
  }

  if (action.type === 'SET_CUSTOM_TEXT') {
    return {
      ...current,
      customText: typeof action.text === 'string' ? action.text : ''
    };
  }

  if (action.type === 'TOGGLE_OTC') {
    const otcId = action.otcId;
    const exists = current.activeOtcIds.includes(otcId);
    const nextOtcs = exists
      ? current.activeOtcIds.filter((id) => id !== otcId)
      : [...current.activeOtcIds, otcId];
    return {
      ...current,
      activeOtcIds: nextOtcs
    };
  }

  if (action.type === 'TOGGLE_SYMPTOM') {
    const symId = action.symptomId;
    const exists = current.selectedSymptomIds.includes(symId);
    const nextSymptoms = exists
      ? current.selectedSymptomIds.filter((id) => id !== symId)
      : [...current.selectedSymptomIds, symId];
    return {
      ...current,
      selectedSymptomIds: nextSymptoms
    };
  }

  return current;
}

export function buildUiViewState(state) {
  const current = state || createInitialAppState();
  const safeLang = current.lang === 'es' ? 'es' : 'en';
  const scenario = getScenarioById(current.scenarioId);
  const usingCustomText =
    typeof current.customText === 'string' && current.customText.trim().length >= 1;

  const sourceNote = usingCustomText
    ? current.customText.trim()
    : scenario.rawClinicalNote;

  const nlpAnalysis = usingCustomText
    ? dejargonizeClinicalText(sourceNote, safeLang)
    : analyzeClinicalTransformation(
      sourceNote,
      safeLang === 'es' ? scenario.curatedPlainEs : scenario.curatedPlainEn,
      safeLang
    );
  const plainPatientParagraph = nlpAnalysis.translatedText;

  const scheduleReport = buildMedicationScheduleAndCollisions(
    scenario.id,
    current.activeOtcIds,
    safeLang
  );

  const triageReport = evaluateSymptomTriage(
    scenario.id,
    current.selectedSymptomIds,
    safeLang
  );

  return {
    scenarioId: scenario.id,
    scenarioCode: scenario.code,
    lang: safeLang,
    usingCustomText,
    departmentLabel:
      safeLang === 'es' ? scenario.departmentEs : scenario.departmentEn,
    scenarioTitle: safeLang === 'es' ? scenario.titleEs : scenario.titleEn,
    patientContext:
      safeLang === 'es' ? scenario.patientContextEs : scenario.patientContextEn,
    rawClinicalNote: sourceNote,
    sourceSpans: locateJargonSpans(sourceNote),
    plainPatientParagraph,
    nlpAnalysis,
    medications: scenario.medications,
    labsAndVitals: scenario.labsAndVitals,
    symptoms: scenario.symptoms,
    scheduleReport,
    triageReport,
    activeOtcIds: current.activeOtcIds,
    selectedSymptomIds: current.selectedSymptomIds
  };
}

/**
 * Negation detection, NegEx-style, documented so the behavior is testable:
 * - Single-word cues: no, not, never, none, denies, denied, deny, without,
 *   negative, absent, absence, lacks.
 * - Multi-word cues: rule(s)/ruled out, free of, devoid of, clear of,
 *   negative for, absence of, no/without (any|evidence|history|signs) of,
 *   denies any.
 * - Scope window: up to 10 tokens before the term. A cue stops applying at
 *   any . ! ? ; : boundary, at a termination word (but, however, yet, ...),
 *   and across a comma unless the comma sits inside an explicit conjunction
 *   list (and, or, nor, &, /). Verb cues (denies/denied/deny) also scope over
 *   a bare comma list ("denies fever, chills, dyspnea"); determiner cues
 *   ("no", "without") do not.
 * - Pseudo-negations do not fire: "not only", "not rule(d) out", and
 *   "rule(d) out" preceded by a modal or negator (cannot, could, may, might,
 *   would, will, should, to, unable, hardly, barely, never, not).
 * - Postposed cues after the term: denied, denies, ruled out, rules out,
 *   negative, absent, free, resolved, resolving, with optional chart
 *   punctuation and auxiliaries ("dyspnea was denied", "dyspnea: negative").
 *   An intervening "not"/"never" makes the postposed cue pseudo
 *   ("dyspnea not ruled out" stays affirmed).
 */
export const NEGATION_CUES = [
  'no', 'not', 'never', 'none', 'denies', 'denied', 'deny', 'without',
  'negative', 'absent', 'absence', 'lacks',
  'rules out', 'rule out', 'ruled out', 'free of', 'devoid of', 'clear of',
  'negative for', 'absence of', 'no evidence of', 'no history of',
  'no signs of', 'no sign of', 'without evidence of', 'without any', 'denies any'
];

const NEGATION_SINGLE_CUES = new Set([
  'no', 'not', 'never', 'none', 'denies', 'denied', 'deny', 'without',
  'negative', 'absent', 'absence', 'lacks'
]);
const NEGATION_VERB_CUES = new Set(['denies', 'denied', 'deny']);
const NEGATION_PHRASE_CUES = new Set([
  'rule out', 'rules out', 'ruled out',
  'free of', 'devoid of', 'clear of',
  'negative for', 'absence of',
  'no evidence of', 'no history of', 'no signs of', 'no sign of',
  'without evidence of', 'without any', 'denies any'
]);
const NEGATION_TERMINATORS = new Set([
  'but', 'however', 'yet', 'though', 'although', 'except',
  'still', 'nevertheless', 'nonetheless'
]);
const NEGATION_CONJUNCTIONS = new Set(['and', 'or', 'nor']);
const RULE_OUT_PRECEDERS = new Set([
  'not', 'cannot', "can't", 'cant', 'could', "couldn't", 'couldnt', 'can',
  'may', 'might', 'would', "wouldn't", 'wouldnt', 'will', "won't", 'wont',
  'should', "shouldn't", 'shouldnt', 'to', 'unable', 'never', 'hardly', 'barely'
]);
const POSTPOSED_CUES = /(denied|denies|ruled\s+out|rules?\s+out|negative|absent|free|resolved|resolving)\b/i;
const POSTPOSED_AUX = new Set([
  'was', 'were', 'is', 'are', 'been', 'being', 'be', 'remains', 'remain',
  'remained', 'still', 'now', 'currently', 'felt', 'feels', 'seems', 'seemed',
  'appears', 'appeared', 'became', 'becomes', 'reported', 'documented',
  'noted', 'also', 'clinically', 'not', 'never'
]);
const NEGATION_PRE_WINDOW_TOKENS = 10;

function negationTokenWord(raw) {
  return String(raw || '').toLowerCase().replace(/[^a-z']/g, '');
}

export function isNegatedContext(text, start = 0, length = 0) {
  if (typeof text !== 'string') return false;
  const safeStart = Number.isFinite(start) ? Math.max(0, start) : 0;
  const safeLength = Number.isFinite(length) ? Math.max(0, length) : 0;
  const end = safeStart + safeLength;

  // Postposed cues: charting shorthand after the term itself.
  const after = text.slice(end, Math.min(text.length, end + 56));
  const postMatch = new RegExp(`^[\\s:;,()\\[\\]\\/\\-]*([a-z' ]*?)${POSTPOSED_CUES.source}`, 'i').exec(after);
  if (postMatch) {
    const auxWords = postMatch[1].trim().split(/\s+/).filter(Boolean).map(negationTokenWord).filter(Boolean);
    const allAux = auxWords.every((w) => POSTPOSED_AUX.has(w));
    const hasNegator = auxWords.some((w) => w === 'not' || w === 'never');
    if (allAux && !hasNegator) return true;
  }

  // Pre-cue scan, right to left over the last N tokens.
  const before = text.slice(Math.max(0, safeStart - 160), safeStart);
  const tokens = before.split(/\s+/).filter(Boolean).slice(-NEGATION_PRE_WINDOW_TOKENS);
  let listOk = false;
  let commaBlocked = false;
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const raw = tokens[i];
    if (/[.!?;:]/.test(raw)) break;
    const w = negationTokenWord(raw);
    if (w === '') continue;
    if (NEGATION_CONJUNCTIONS.has(w) || raw === '/' || raw === '&') {
      listOk = true;
      continue;
    }
    if (NEGATION_TERMINATORS.has(w)) break;

    const nextW = i + 1 < tokens.length ? negationTokenWord(tokens[i + 1]) : '';
    const next2W = i + 2 < tokens.length ? negationTokenWord(tokens[i + 2]) : '';
    const prevW = i - 1 >= 0 ? negationTokenWord(tokens[i - 1]) : '';
    const pair = `${w} ${nextW}`;
    const tri = `${pair} ${next2W}`;

    let cueFound = false;
    if (NEGATION_PHRASE_CUES.has(tri) || NEGATION_PHRASE_CUES.has(pair) || NEGATION_SINGLE_CUES.has(w)) {
      cueFound = true;
      if (w === 'not' && (nextW === 'only' || nextW === 'certain' || nextW === 'sure' || nextW === 'clear' || /^ruled?\b/.test(nextW))) {
        cueFound = false;
      }
      if (cueFound && /^rule/.test(w) && RULE_OUT_PRECEDERS.has(prevW)) {
        cueFound = false;
      }
    }

    if (cueFound) {
      if (commaBlocked && !listOk && !NEGATION_VERB_CUES.has(w)) break;
      return true;
    }

    if (raw.includes(',') && !listOk) commaBlocked = true;
  }
  return false;
}

export function detectNegatedTerms(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  return locateJargonSpans(text).filter((s) => s.negated === true);
}

export function hasNegation(text) {
  return detectNegatedTerms(text).length > 0;
}

// --- Dosage / unit handling ---
const DOSAGE_REGEX = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(mg|mcg|g|mL|ml|units?|IU|mmol|meq|mEq|%|puffs?|tablets?|mL\/min\/1\.73m2|mEq\/L|mmHg|mIU\/L|g\/dL|K\/uL|breaths\/min|mg\/dL)\b/gi;

function parseDosageNumber(raw) {
  return Number(String(raw).replace(/,/g, ''));
}

export function parseDosages(text) {
  if (typeof text !== 'string') return [];
  const out = [];
  let m = DOSAGE_REGEX.exec(text);
  while (m !== null) {
    out.push({ value: parseDosageNumber(m[1]), unit: m[2], raw: m[0], index: m.index });
    if (m[0].length === 0) DOSAGE_REGEX.lastIndex += 1;
    m = DOSAGE_REGEX.exec(text);
  }
  DOSAGE_REGEX.lastIndex = 0;
  return out;
}

export function compareDosages(sourceText, claimedText) {
  const src = parseDosages(sourceText);
  const clm = parseDosages(claimedText);
  const mismatches = [];
  // Match by unit; flag value differences for shared units
  const units = new Set([...src.map((d) => d.unit.toLowerCase()), ...clm.map((d) => d.unit.toLowerCase())]);
  for (const u of units) {
    const sVals = src.filter((d) => d.unit.toLowerCase() === u).map((d) => d.value);
    const cVals = clm.filter((d) => d.unit.toLowerCase() === u).map((d) => d.value);
    // For each claimed value, check it exists in source
    for (const cv of cVals) {
      if (!sVals.includes(cv)) {
        mismatches.push({ unit: u, claimed: cv, source: sVals });
      }
    }
  }
  return {
    match: mismatches.length === 0 && src.length === clm.length && src.length > 0,
    sourceDosages: src,
    claimedDosages: clm,
    mismatches
  };
}

export function detectDosageMismatch(sourceText, claimedText) {
  return compareDosages(sourceText, claimedText).mismatches;
}

export function detectDosageMismatches(sourceText, claimedText) {
  return detectDosageMismatch(sourceText, claimedText);
}

// --- Claim verification ---
const CLAIM_DOSE_REGEX = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(mg|mcg|g|mL|ml|units?|IU|mmol|meq|mEq|%|mL\/min\/1\.73m2|mEq\/L|mmHg|mIU\/L|g\/dL|K\/uL|breaths\/min|mg\/dL)\b/gi;
const CLAIM_MED_REGEX = /\b([A-Z][a-zA-Z]{2,})\s+(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(mg|mcg|g|mL|units?|IU)\b/g;
const CLAIM_LAB_MARKERS = 'eGFR|HbA1c|A1c|SpO2|O2\\s*sat|K\\+|potassium|BP|TSH|glucose|creatinine|INR|platelets|WBC|hemoglobin|Hgb|RR|HR|temperature|temp';
const CLAIM_LAB_REGEX = new RegExp(`\\b(${CLAIM_LAB_MARKERS})\\b[^\\d.!?\\n]{0,24}(\\d+(?:\\.\\d+)?)\\s*(%|mL/min/1\\.73m2|mEq/L|mmol/L|mmHg|mIU/L|g/dL|K/uL|breaths/min|mg/dL)?`, 'gi');
const CLAIM_DATE_REGEX = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})\b|\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi;

const MONTH_INDEX = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

/** Canonicalize a written date to yyyymmdd digits when the format is known. */
export function canonicalDateString(raw) {
  const s = String(raw || '').trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${m[1]}${m[2]}${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}${m[1].padStart(2, '0')}${m[2].padStart(2, '0')}`;
  }
  m = /^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*(\d{4}))?$/.exec(s);
  if (m && MONTH_INDEX[m[1].slice(0, 3).toLowerCase()]) {
    return `${m[3] || '0000'}${String(MONTH_INDEX[m[1].slice(0, 3).toLowerCase()]).padStart(2, '0')}${m[2].padStart(2, '0')}`;
  }
  m = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(s);
  if (m && MONTH_INDEX[m[2].slice(0, 3).toLowerCase()]) {
    return `${m[3]}${String(MONTH_INDEX[m[2].slice(0, 3).toLowerCase()]).padStart(2, '0')}${m[1].padStart(2, '0')}`;
  }
  return null;
}

export function extractDateStrings(text) {
  if (typeof text !== 'string') return [];
  const out = [];
  let m = CLAIM_DATE_REGEX.exec(text);
  while (m !== null) {
    out.push(m[0]);
    if (m[0].length === 0) CLAIM_DATE_REGEX.lastIndex += 1;
    m = CLAIM_DATE_REGEX.exec(text);
  }
  CLAIM_DATE_REGEX.lastIndex = 0;
  return out;
}

/**
 * Extract checkable claims from generated text: medication+dose, lab marker+value,
 * standalone dosages, and dates. Claims are positions in the generated text, so
 * each can be highlighted and independently verified against the source note.
 */
export function extractClaims(text) {
  if (typeof text !== 'string' || text.trim().length === 0) return [];
  const claims = [];
  const covered = [];

  let m = CLAIM_MED_REGEX.exec(text);
  while (m !== null) {
    claims.push({ type: 'medication', subject: m[1], value: parseDosageNumber(m[2]), unit: m[3], raw: m[0], index: m.index });
    covered.push([m.index, m.index + m[0].length]);
    if (m[0].length === 0) CLAIM_MED_REGEX.lastIndex += 1;
    m = CLAIM_MED_REGEX.exec(text);
  }
  CLAIM_MED_REGEX.lastIndex = 0;

  let l = CLAIM_LAB_REGEX.exec(text);
  while (l !== null) {
    claims.push({ type: 'lab', subject: l[1], value: Number(l[2]), unit: l[3] || '', raw: l[0], index: l.index });
    covered.push([l.index, l.index + l[0].length]);
    if (l[0].length === 0) CLAIM_LAB_REGEX.lastIndex += 1;
    l = CLAIM_LAB_REGEX.exec(text);
  }
  CLAIM_LAB_REGEX.lastIndex = 0;

  let d = CLAIM_DATE_REGEX.exec(text);
  while (d !== null) {
    claims.push({ type: 'date', subject: 'date', value: null, unit: '', raw: d[0], index: d.index });
    covered.push([d.index, d.index + d[0].length]);
    if (d[0].length === 0) CLAIM_DATE_REGEX.lastIndex += 1;
    d = CLAIM_DATE_REGEX.exec(text);
  }
  CLAIM_DATE_REGEX.lastIndex = 0;

  let g = CLAIM_DOSE_REGEX.exec(text);
  while (g !== null) {
    const inside = covered.some(([s, e]) => g.index >= s && g.index < e);
    if (!inside) {
      claims.push({ type: 'dosage', subject: null, value: parseDosageNumber(g[1]), unit: g[2], raw: g[0], index: g.index });
    }
    if (g[0].length === 0) CLAIM_DOSE_REGEX.lastIndex += 1;
    g = CLAIM_DOSE_REGEX.exec(text);
  }
  CLAIM_DOSE_REGEX.lastIndex = 0;

  claims.sort((a, b) => a.index - b.index);
  return claims;
}

const LAB_SUBJECT_ALIASES = {
  a1c: ['a1c', 'hba1c', 'hemoglobin a1c'],
  hba1c: ['hba1c', 'a1c', 'hemoglobin a1c'],
  hemoglobina1c: ['hba1c', 'a1c', 'hemoglobin a1c'],
  spo2: ['spo2', 'o2 sat', 'oxygen saturation', 'pulse ox'],
  o2sat: ['o2 sat', 'spo2', 'oxygen saturation'],
  potassium: ['potassium', 'k+', 'serum k', 'serum potassium'],
  'k+': ['k+', 'potassium', 'serum k'],
  k: ['k+', 'potassium'],
  bp: ['bp', 'blood pressure'],
  bloodpressure: ['bp', 'blood pressure'],
  tsh: ['tsh', 'thyroid stimulating hormone'],
  egfr: ['egfr', 'kidney filtration score', 'kidney score'],
  glucose: ['glucose', 'blood sugar', 'fingerstick glucose'],
  creatinine: ['creatinine'],
  inr: ['inr'],
  hemoglobin: ['hemoglobin', 'hgb'],
  hgb: ['hgb', 'hemoglobin'],
  platelets: ['platelets', 'plt'],
  wbc: ['wbc', 'white blood cell'],
  rr: ['rr', 'respiratory rate'],
  hr: ['hr', 'heart rate'],
  temp: ['temp', 'temperature'],
  temperature: ['temperature', 'temp']
};

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function subjectSearchForms(subject) {
  const norm = String(subject || '').toLowerCase().replace(/[^a-z0-9+]/g, '');
  const alias = LAB_SUBJECT_ALIASES[norm];
  if (alias) return alias;
  return [String(subject || '').toLowerCase()];
}

function subjectOccurrenceRegex(form) {
  const escaped = escapeRegExp(form).replace(/\s+/g, '\\s+');
  const tail = /[a-z0-9]$/i.test(form) ? '\\b' : '';
  return new RegExp(`\\b${escaped}${tail}`, 'gi');
}

const UNIT_NORMALIZATION = {
  'µg': 'mcg', 'ug': 'mcg', 'gm': 'g', 'mgs': 'mg', 'cc': 'ml', 'ml': 'mL'
};

function unitsEquivalent(a, b) {
  const norm = (u) => UNIT_NORMALIZATION[String(u || '').toLowerCase()] || String(u || '').toLowerCase();
  return norm(a) === norm(b);
}

const CLAIM_WINDOW_AFTER = 72;
const CLAIM_WINDOW_BEFORE = 28;
const ALL_LAB_FORMS = [...new Set(Object.values(LAB_SUBJECT_ALIASES).flat())];
const MED_ANCHOR_REGEX = /\b[A-Z][a-zA-Z]{2,}(?=\s+\d)/g;

/**
 * Every subject-like anchor in a source: lab markers (any alias form) and
 * Capitalized drug-style names that sit in front of a number. Used to bound
 * claim-verification windows so a value written next to a neighboring subject
 * can never corroborate this one.
 */
function subjectAnchorsIn(src, exclude) {
  const anchors = [];
  for (const form of ALL_LAB_FORMS) {
    const re = subjectOccurrenceRegex(form);
    let m = re.exec(src);
    while (m !== null) {
      anchors.push({ start: m.index, end: m.index + m[0].length });
      if (m[0].length === 0) re.lastIndex += 1;
      m = re.exec(src);
    }
  }
  MED_ANCHOR_REGEX.lastIndex = 0;
  let m = MED_ANCHOR_REGEX.exec(src);
  while (m !== null) {
    anchors.push({ start: m.index, end: m.index + m[0].length });
    m = MED_ANCHOR_REGEX.exec(src);
  }
  anchors.sort((a, b) => a.start - b.start);
  return exclude ? anchors.filter((a) => a.end <= exclude.start || a.start >= exclude.end) : anchors;
}
const CLAIM_VALUE_TOKEN = /^[±]?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(%|mg|mcg|g|mL|ml|units?|IU|mmol|meq|mEq|mL\/min\/1\.73m2|mEq\/L|mmol\/L|mmHg|mIU\/L|g\/dL|K\/uL|breaths\/min|mg\/dL|uL)?[,;:.\)]*$/i;
const CLAIM_LOOSE_UNIT = /^(mL\/min\/1\.73m2|mEq\/L|mmol\/L|breaths\/min|mg\/dL|g\/dL|K\/uL|mIU\/L|mmHg|mmol|mEq|meq|mcg|mg|g|mL|ml|units?|IU|%|uL)\b/i;

/** A '.' inside a decimal number is not a clause boundary; other . ! ? ; : are. */
function isClaimBoundary(text, i) {
  const ch = text[i];
  if ('!?;:'.includes(ch)) return true;
  if (ch === '.') {
    return !(i > 0 && i + 1 < text.length && /[0-9]/.test(text[i - 1]) && /[0-9]/.test(text[i + 1]));
  }
  return false;
}

/** Numeric tokens inside a text window, with positions and optional units. */
function numbersInWindow(windowText, offsetBase) {
  const out = [];
  const tokenRegex = /\S+/g;
  let t = tokenRegex.exec(windowText);
  while (t !== null) {
    const token = t[0].replace(/^[(\["']+/, '');
    const m = CLAIM_VALUE_TOKEN.exec(token);
    if (m) {
      let unit = m[2] || '';
      if (!unit) {
        const rest = windowText.slice(t.index + t[0].length);
        const lead = /^\s*(\S+)/.exec(rest);
        if (lead) {
          const bare = lead[1].replace(/[,;:.\)\]]+$/, '');
          if (CLAIM_LOOSE_UNIT.test(bare)) unit = bare;
        }
      }
      out.push({ value: parseDosageNumber(m[1]), unit, start: offsetBase + t.index, end: offsetBase + t.index + token.length });
    }
    if (t[0].length === 0) tokenRegex.lastIndex += 1;
    t = tokenRegex.exec(windowText);
  }
  return out;
}

/**
 * Verify one claim against the source note. A claim is supported when its exact
 * text appears, or when its subject appears with the claimed value (and unit)
 * inside the same clause region. Subject present but a different value on site
 * is a mismatch, not a vague subject match; subject absent is unsupported.
 */
export function verifyClaim(claim, sourceText) {
  const src = typeof sourceText === 'string' ? sourceText : '';
  if (!claim || typeof claim.raw !== 'string') {
    return { supported: false, reason: 'invalid-claim', spans: [] };
  }
  const idx = src.toLowerCase().indexOf(claim.raw.toLowerCase());
  if (idx !== -1) {
    return { supported: true, reason: 'exact-match', spans: [{ start: idx, end: idx + claim.raw.length }] };
  }

  if (claim.type === 'date') {
    const canon = canonicalDateString(claim.raw);
    const srcDates = extractDateStrings(src);
    if (canon !== null) {
      const canonSource = srcDates.map(canonicalDateString);
      if (canonSource.includes(canon)) {
        const hit = src.toLowerCase().indexOf(claim.raw.toLowerCase());
        return { supported: true, reason: 'date-match', spans: hit === -1 ? [] : [{ start: hit, end: hit + claim.raw.length }] };
      }
      return { supported: false, reason: 'date-mismatch', spans: [], found: srcDates };
    }
    return { supported: false, reason: 'date-mismatch', spans: [], found: srcDates };
  }

  if (claim.subject) {
    const forms = subjectSearchForms(claim.subject);
    const occurrences = [];
    for (const form of forms) {
      const re = subjectOccurrenceRegex(form);
      let m = re.exec(src);
      while (m !== null) {
        occurrences.push({ start: m.index, end: m.index + m[0].length });
        if (m[0].length === 0) re.lastIndex += 1;
        m = re.exec(src);
      }
    }
    occurrences.sort((a, b) => a.start - b.start);
    if (occurrences.length === 0) {
      return { supported: false, reason: 'unsupported', spans: [] };
    }
    if (claim.value === undefined || claim.value === null || Number.isNaN(claim.value)) {
      return { supported: true, reason: 'subject-match', spans: occurrences };
    }
    const near = [];
    const windows = occurrences.map((occ) => {
      const wStart = Math.max(0, occ.start - CLAIM_WINDOW_BEFORE);
      const wEnd = Math.min(src.length, occ.end + CLAIM_WINDOW_AFTER);
      const beforeSlice = src.slice(wStart, occ.start);
      let lastBoundary = -1;
      for (let i = 0; i < beforeSlice.length; i += 1) {
        if (isClaimBoundary(beforeSlice, i)) lastBoundary = i;
      }
      const backStart = wStart + lastBoundary + 1;
      const afterSlice = src.slice(occ.end, wEnd);
      let fwdEnd = afterSlice.length;
      for (let i = 0; i < afterSlice.length; i += 1) {
        if (isClaimBoundary(afterSlice, i)) { fwdEnd = i; break; }
      }
      // A value parked next to a different subject belongs to that subject:
      // the window stops at the nearest other anchor on each side.
      const anchors = subjectAnchorsIn(src, occ);
      let backLimit = occ.start;
      for (const a of anchors) {
        if (a.start >= backStart && a.start < occ.start) { backLimit = a.start; break; }
      }
      let fwdLimit = occ.end + fwdEnd;
      for (const a of anchors) {
        if (a.start >= occ.end && a.start < fwdLimit) { fwdLimit = a.start; break; }
      }
      const base = backStart;
      const windowText = src.slice(backStart, backLimit) + src.slice(occ.start, occ.end) + src.slice(occ.end, fwdLimit);
      const occRange = [occ.start - base, occ.end - base];
      return { base, windowText, occ, occRange };
    });
    let unitConflict = null;
    for (const w of windows) {
      const nums = numbersInWindow(w.windowText, w.base).filter((n) => !(n.start >= w.occ.start && n.end <= w.occ.end));
      for (const n of nums) near.push(n);
      const hit = nums.find((n) => n.value === claim.value);
      if (hit) {
        if (claim.unit && hit.unit && !unitsEquivalent(hit.unit, claim.unit)) {
          unitConflict = { claimedUnit: claim.unit, foundUnit: hit.unit, span: hit };
          continue;
        }
        if (claim.unit && !hit.unit) {
          // a bare number near the subject still corroborates the claim
        }
        const start = Math.min(w.occ.start, hit.start);
        const end = Math.max(w.occ.end, hit.end);
        return { supported: true, reason: 'subject-value-match', spans: [{ start, end }] };
      }
    }
    if (unitConflict) {
      return {
        supported: false,
        reason: 'unit-mismatch',
        spans: occurrences,
        found: [...new Set(near.map((n) => n.value))].slice(0, 6),
        detail: unitConflict
      };
    }
    const reason = claim.type === 'lab' ? 'lab-value-mismatch' : 'dosage-mismatch';
    return {
      supported: false,
      reason,
      spans: occurrences,
      found: [...new Set(near.map((n) => n.value))].slice(0, 6)
    };
  }

  if (claim.value !== undefined && claim.value !== null) {
    const doses = parseDosages(src);
    const match = doses.some((d) => d.value === claim.value && unitsEquivalent(d.unit, claim.unit));
    if (!match) {
      const sameUnit = doses.filter((d) => unitsEquivalent(d.unit, claim.unit)).map((d) => d.value);
      return { supported: false, reason: 'dosage-mismatch', spans: [], found: [...new Set(sameUnit)].slice(0, 6) };
    }
    const hit = doses.find((d) => d.value === claim.value && unitsEquivalent(d.unit, claim.unit));
    return { supported: true, reason: 'dosage-match', spans: [{ start: hit.index, end: hit.index + hit.raw.length }] };
  }
  return { supported: false, reason: 'unsupported', spans: [] };
}

export function verifyClaims(claims, sourceText) {
  const list = Array.isArray(claims) ? claims : [];
  const results = list.map((c) => ({ claim: c, ...verifyClaim(c, sourceText) }));
  const supported = results.filter((r) => r.supported).length;
  const unsupported = results.length - supported;
  return {
    total: results.length,
    supported,
    unsupported,
    precision: results.length ? supported / results.length : 1,
    results
  };
}

/**
 * Verify every checkable claim inside generated text against the source note.
 * Adds the generated-text span of each claim so the UI can highlight it.
 */
export function verifyGeneratedText(sourceText, generatedText) {
  const claims = extractClaims(generatedText);
  const report = verifyClaims(claims, sourceText);
  const results = report.results.map((r) => ({
    ...r,
    claimStart: r.claim.index,
    claimEnd: r.claim.index + r.claim.raw.length
  }));
  return { ...report, results };
}

export function verifyClaimAgainstSource(claim, sourceText) {
  return verifyClaim(claim, sourceText);
}

export function verifyClaimsAgainstSource(claims, sourceText) {
  return verifyClaims(claims, sourceText);
}

// --- Audit trail ---
export function buildAuditTrail(viewState) {
  const vs = viewState || {};
  const source = typeof vs.rawClinicalNote === 'string' ? vs.rawClinicalNote : '';
  const generated = typeof vs.plainPatientParagraph === 'string' ? vs.plainPatientParagraph : '';
  const spans = Array.isArray(vs.sourceSpans) ? vs.sourceSpans : locateJargonSpans(source);
  const entries = spans.map((s, i) => ({
    index: i + 1,
    term: s.term,
    id: s.id,
    category: s.category,
    surface: s.text,
    start: s.start,
    end: s.end,
    negated: s.negated === true,
    verified: true,
    status: 'source-span',
    reason: ''
  }));
  // Add dosage entries
  for (const d of parseDosages(source)) {
    entries.push({
      index: entries.length + 1,
      term: 'dosage',
      id: 'dosage',
      category: 'dose',
      surface: d.raw,
      start: d.index,
      end: d.index + d.raw.length,
      negated: false,
      verified: true,
      status: 'source-dose',
      reason: ''
    });
  }
  // Add claim-check entries: every extracted claim in the shown output,
  // flagged when the source does not support it.
  if (generated) {
    const check = verifyGeneratedText(source, generated);
    for (const r of check.results) {
      entries.push({
        index: entries.length + 1,
        term: 'claim',
        id: `claim-${r.claim.type || 'generic'}`,
        category: 'claim-check',
        surface: r.claim.raw,
        start: r.claimStart,
        end: r.claimEnd,
        negated: false,
        verified: r.supported === true,
        status: r.supported ? 'verified' : 'flagged',
        reason: r.supported ? '' : r.reason
      });
    }
  }
  return entries;
}

export function exportAuditTrail(entries, format = 'json') {
  const list = Array.isArray(entries) ? entries : [];
  if (format === 'csv') {
    const header = 'index,term,id,category,surface,start,end,negated,verified,status,reason';
    const rows = list.map((e) => `${e.index},"${String(e.term).replace(/"/g, '""')}","${String(e.id).replace(/"/g, '""')}","${String(e.category).replace(/"/g, '""')}","${String(e.surface).replace(/"/g, '""')}",${e.start},${e.end},${e.negated},${e.verified},"${String(e.status || '').replace(/"/g, '""')}","${String(e.reason || '').replace(/"/g, '""')}"`);
    return [header, ...rows].join('\n');
  }
  return JSON.stringify(list, null, 2);
}

export function exportAuditTrailJSON(entries) {
  return exportAuditTrail(entries, 'json');
}

export function exportAuditTrailCsv(entries) {
  return exportAuditTrail(entries, 'csv');
}

// aliases
export const detectNegation = detectNegatedTerms;
export const negationOf = isNegatedContext;
export const findNegations = detectNegatedTerms;
export const dosageMismatch = detectDosageMismatch;
export const checkDosageMismatch = detectDosageMismatch;
export const auditTrail = buildAuditTrail;
