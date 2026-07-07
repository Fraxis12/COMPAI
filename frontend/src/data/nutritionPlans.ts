import { CuratedNutritionPlan } from "../types/nutrition";

export const publicNutritionGuidelinePlans: CuratedNutritionPlan[] = [
  {
    id: "myplate-balanced",
    nombre: "Plan Balanceado MyPlate",
    descripcion: "Organiza el plato con frutas, verduras, granos integrales, proteínas magras y lácteos o alternativas fortificadas.",
    objetivoRecomendado: "Rutina diaria equilibrada y educación alimentaria general.",
    caloriasAproximadas: "1,900-2,300 kcal",
    objetivosDiarios: { calorias: 1860, proteinasG: 95, carbohidratosG: 226, grasasG: 64, comidas: 4 },
    comidasPorDia: 4,
    macros: { proteinas: 22, carbohidratos: 50, grasas: 28 },
    fuente: {
      nombre: "USDA MyPlate",
      descripcion: "Guía pública de grupos alimenticios y composición equilibrada del plato.",
      url: "https://www.myplate.gov/"
    },
    dificultad: "Fácil",
    etiqueta: "Balanceado",
    recomendacionGeneral: "Prioriza variedad, porciones consistentes y agua durante el día. Ajusta cantidades según hambre, actividad y preferencias.",
    comidas: [
      { id: "myplate-balanced-breakfast", nombre: "Desayuno", descripcion: "Avena con fruta, yogur natural o bebida fortificada y semillas.", caloriasAprox: 430, proteinasG: 20, carbohidratosG: 62, grasasG: 12 },
      { id: "myplate-balanced-lunch", nombre: "Almuerzo", descripcion: "Medio plato de verduras, arroz integral, pollo o menestras y una fruta.", caloriasAprox: 650, proteinasG: 34, carbohidratosG: 82, grasasG: 20 },
      { id: "myplate-balanced-dinner", nombre: "Cena", descripcion: "Pescado, tortilla o tofu con verduras salteadas y papa/camote.", caloriasAprox: 560, proteinasG: 32, carbohidratosG: 58, grasasG: 22 },
      { id: "myplate-balanced-snack", nombre: "Snack", descripcion: "Fruta con frutos secos o queso fresco en porción moderada.", caloriasAprox: 220, proteinasG: 9, carbohidratosG: 24, grasasG: 10 }
    ],
    alimentosRecomendados: ["Verduras variadas", "Frutas enteras", "Granos integrales", "Legumbres", "Pescado", "Huevos", "Yogur natural"],
    alimentosAModerar: ["Bebidas azucaradas", "Frituras frecuentes", "Postres altos en azúcar", "Embutidos", "Snacks ultraprocesados"]
  },
  {
    id: "dash-heart",
    nombre: "Plan DASH Saludable",
    descripcion: "Patrón alto en frutas, verduras, granos integrales, legumbres y lácteos bajos en grasa, con sodio moderado.",
    objetivoRecomendado: "Cuidar hábitos cardiovasculares y mejorar calidad general de la dieta.",
    caloriasAproximadas: "1,800-2,200 kcal",
    objetivosDiarios: { calorias: 1780, proteinasG: 91, carbohidratosG: 218, grasasG: 58, comidas: 4 },
    comidasPorDia: 4,
    macros: { proteinas: 20, carbohidratos: 52, grasas: 28 },
    fuente: {
      nombre: "NHLBI DASH Eating Plan",
      descripcion: "Guía pública del National Heart, Lung, and Blood Institute sobre el patrón DASH.",
      url: "https://www.nhlbi.nih.gov/education/dash-eating-plan"
    },
    dificultad: "Intermedio",
    etiqueta: "Corazón",
    recomendacionGeneral: "Construye comidas con alimentos frescos y reduce gradualmente sodio, salsas saladas y productos muy procesados.",
    comidas: [
      { id: "dash-heart-breakfast", nombre: "Desayuno", descripcion: "Pan integral con palta, fruta y leche o yogur bajo en grasa.", caloriasAprox: 390, proteinasG: 18, carbohidratosG: 56, grasasG: 11 },
      { id: "dash-heart-lunch", nombre: "Almuerzo", descripcion: "Bowl de quinoa, lentejas, verduras, aceite de oliva y fruta.", caloriasAprox: 620, proteinasG: 28, carbohidratosG: 86, grasasG: 18 },
      { id: "dash-heart-dinner", nombre: "Cena", descripcion: "Pescado al horno con ensalada grande y camote.", caloriasAprox: 560, proteinasG: 35, carbohidratosG: 54, grasasG: 20 },
      { id: "dash-heart-snack", nombre: "Snack", descripcion: "Yogur natural con frutos rojos o frutos secos sin sal.", caloriasAprox: 210, proteinasG: 10, carbohidratosG: 22, grasasG: 9 }
    ],
    alimentosRecomendados: ["Frutas", "Verduras", "Legumbres", "Granos integrales", "Lácteos bajos en grasa", "Frutos secos sin sal", "Pescado"],
    alimentosAModerar: ["Sal agregada", "Sopas instantáneas", "Embutidos", "Salsas altas en sodio", "Comida rápida"]
  },
  {
    id: "mediterranean",
    nombre: "Plan Mediterráneo",
    descripcion: "Patrón basado en verduras, frutas, legumbres, cereales integrales, pescado, aceite de oliva y frutos secos.",
    objetivoRecomendado: "Energía sostenida, variedad alimentaria y hábitos flexibles a largo plazo.",
    caloriasAproximadas: "1,900-2,400 kcal",
    objetivosDiarios: { calorias: 1950, proteinasG: 93, carbohidratosG: 208, grasasG: 80, comidas: 4 },
    comidasPorDia: 4,
    macros: { proteinas: 20, carbohidratos: 45, grasas: 35 },
    fuente: {
      nombre: "Dietary Guidelines y patrón Mediterráneo",
      descripcion: "Referencias públicas sobre patrones alimentarios saludables y alimentos mediterráneos comunes.",
      url: "https://www.dietaryguidelines.gov/"
    },
    dificultad: "Fácil",
    etiqueta: "Energía",
    recomendacionGeneral: "Usa aceite de oliva como grasa principal en porciones moderadas y combina legumbres o pescado con vegetales.",
    comidas: [
      { id: "mediterranean-breakfast", nombre: "Desayuno", descripcion: "Yogur natural con fruta, avena y nueces.", caloriasAprox: 440, proteinasG: 21, carbohidratosG: 48, grasasG: 18 },
      { id: "mediterranean-lunch", nombre: "Almuerzo", descripcion: "Ensalada de garbanzos con verduras, aceite de oliva y pan integral.", caloriasAprox: 650, proteinasG: 26, carbohidratosG: 78, grasasG: 25 },
      { id: "mediterranean-dinner", nombre: "Cena", descripcion: "Pescado con verduras asadas y arroz integral.", caloriasAprox: 620, proteinasG: 38, carbohidratosG: 58, grasasG: 24 },
      { id: "mediterranean-snack", nombre: "Snack", descripcion: "Fruta con almendras o hummus con vegetales.", caloriasAprox: 240, proteinasG: 8, carbohidratosG: 24, grasasG: 13 }
    ],
    alimentosRecomendados: ["Aceite de oliva", "Pescado", "Legumbres", "Verduras", "Frutas", "Frutos secos", "Cereales integrales"],
    alimentosAModerar: ["Carnes procesadas", "Dulces frecuentes", "Mantequilla en exceso", "Bebidas azucaradas"]
  },
  {
    id: "moderate-high-protein",
    nombre: "Plan Alto en Proteínas",
    descripcion: "Distribuye proteína de calidad durante el día con carbohidratos y grasas saludables en cantidades moderadas.",
    objetivoRecomendado: "Recuperación, saciedad y apoyo a entrenamiento de fuerza recreativo.",
    caloriasAproximadas: "2,000-2,500 kcal",
    objetivosDiarios: { calorias: 2080, proteinasG: 142, carbohidratosG: 192, grasasG: 75, comidas: 4 },
    comidasPorDia: 4,
    macros: { proteinas: 30, carbohidratos: 40, grasas: 30 },
    fuente: {
      nombre: "Guía alimentaria pública y datos nutricionales abiertos",
      descripcion: "Enfoque educativo basado en porciones moderadas de proteínas magras y alimentos densos en nutrientes."
    },
    dificultad: "Intermedio",
    etiqueta: "Proteína",
    recomendacionGeneral: "Reparte proteínas en cada comida y acompáñala con vegetales, carbohidratos integrales y descanso suficiente.",
    comidas: [
      { id: "moderate-high-protein-breakfast", nombre: "Desayuno", descripcion: "Huevos o tofu revuelto con pan integral y fruta.", caloriasAprox: 470, proteinasG: 32, carbohidratosG: 42, grasasG: 18 },
      { id: "moderate-high-protein-lunch", nombre: "Almuerzo", descripcion: "Pollo, pescado o tempeh con arroz integral y verduras.", caloriasAprox: 700, proteinasG: 48, carbohidratosG: 70, grasasG: 22 },
      { id: "moderate-high-protein-dinner", nombre: "Cena", descripcion: "Menestras con huevo, queso fresco o tofu y ensalada.", caloriasAprox: 610, proteinasG: 40, carbohidratosG: 52, grasasG: 24 },
      { id: "moderate-high-protein-snack", nombre: "Snack", descripcion: "Yogur griego, fruta y frutos secos.", caloriasAprox: 300, proteinasG: 22, carbohidratosG: 28, grasasG: 11 }
    ],
    alimentosRecomendados: ["Huevos", "Pescado", "Pollo", "Tofu", "Tempeh", "Yogur griego", "Legumbres", "Quinoa"],
    alimentosAModerar: ["Suplementos innecesarios", "Carnes procesadas", "Exceso de frituras", "Barras altas en azúcar"]
  },
  {
    id: "moderate-low-carb",
    nombre: "Plan Bajo en Carbohidratos moderado",
    descripcion: "Reduce carbohidratos refinados sin eliminarlos, priorizando verduras, proteínas, grasas saludables y porciones medidas.",
    objetivoRecomendado: "Control de antojos y organización de comidas con carbohidratos de mejor calidad.",
    caloriasAproximadas: "1,800-2,300 kcal",
    objetivosDiarios: { calorias: 1910, proteinasG: 119, carbohidratosG: 112, grasasG: 102, comidas: 4 },
    comidasPorDia: 4,
    macros: { proteinas: 28, carbohidratos: 32, grasas: 40 },
    fuente: {
      nombre: "Guías alimentarias públicas",
      descripcion: "Enfoque moderado y educativo: no cetogénico ni extremo, con carbohidratos integrales en porciones planificadas."
    },
    dificultad: "Intermedio",
    etiqueta: "Moderado",
    recomendacionGeneral: "Mantén carbohidratos de calidad como frutas, legumbres o granos integrales en porciones adecuadas; evita restricciones extremas.",
    comidas: [
      { id: "moderate-low-carb-breakfast", nombre: "Desayuno", descripcion: "Omelette con verduras, queso fresco y fruta pequeña.", caloriasAprox: 430, proteinasG: 28, carbohidratosG: 24, grasasG: 24 },
      { id: "moderate-low-carb-lunch", nombre: "Almuerzo", descripcion: "Ensalada grande con pollo, palta, menestras pequeñas y aceite de oliva.", caloriasAprox: 670, proteinasG: 42, carbohidratosG: 38, grasasG: 35 },
      { id: "moderate-low-carb-dinner", nombre: "Cena", descripcion: "Pescado o tofu con verduras y porción pequeña de camote.", caloriasAprox: 560, proteinasG: 36, carbohidratosG: 32, grasasG: 28 },
      { id: "moderate-low-carb-snack", nombre: "Snack", descripcion: "Yogur natural o frutos secos con fruta en porción moderada.", caloriasAprox: 250, proteinasG: 13, carbohidratosG: 18, grasasG: 15 }
    ],
    alimentosRecomendados: ["Verduras", "Huevos", "Pescado", "Pollo", "Tofu", "Palta", "Aceite de oliva", "Frutos secos"],
    alimentosAModerar: ["Pan blanco", "Dulces", "Jugos", "Cereales azúcarados", "Porciones grandes de harinas refinadas"]
  },
  {
    id: "balanced-vegetarian",
    nombre: "Plan Vegetariano Balanceado",
    descripcion: "Combina legumbres, tofu, huevos o lácteos si aplica, frutos secos, cereales integrales, frutas y verduras.",
    objetivoRecomendado: "Alimentación vegetariana variada con proteína distribuida durante el día.",
    caloriasAproximadas: "1,900-2,400 kcal",
    objetivosDiarios: { calorias: 1990, proteinasG: 97, carbohidratosG: 235, grasasG: 72, comidas: 4 },
    comidasPorDia: 4,
    macros: { proteinas: 22, carbohidratos: 50, grasas: 28 },
    fuente: {
      nombre: "Guías alimentarias públicas y patrones vegetarianos",
      descripcion: "Referencia educativa basada en proteínas vegetales, cereales integrales y grupos alimenticios equilibrados.",
      url: "https://www.dietaryguidelines.gov/"
    },
    dificultad: "Fácil",
    etiqueta: "Vegetariano",
    recomendacionGeneral: "Incluye proteína en cada comida y presta atención a hierro, calcio, vitamina B12 y omega-3 según tu patrón vegetariano.",
    comidas: [
      { id: "balanced-vegetarian-breakfast", nombre: "Desayuno", descripcion: "Avena con leche o bebida fortificada, fruta, chia y mantequilla de maní.", caloriasAprox: 480, proteinasG: 20, carbohidratosG: 62, grasasG: 18 },
      { id: "balanced-vegetarian-lunch", nombre: "Almuerzo", descripcion: "Lentejas con arroz integral, ensalada y palta.", caloriasAprox: 680, proteinasG: 30, carbohidratosG: 92, grasasG: 20 },
      { id: "balanced-vegetarian-dinner", nombre: "Cena", descripcion: "Tofu salteado o tortilla con verduras y quinoa.", caloriasAprox: 590, proteinasG: 34, carbohidratosG: 56, grasasG: 24 },
      { id: "balanced-vegetarian-snack", nombre: "Snack", descripcion: "Yogur, queso fresco o hummus con vegetales.", caloriasAprox: 240, proteinasG: 13, carbohidratosG: 25, grasasG: 10 }
    ],
    alimentosRecomendados: ["Legumbres", "Tofu", "Huevos", "Lácteos o alternativas fortificadas", "Frutos secos", "Quinoa", "Avena"],
    alimentosAModerar: ["Ultraprocesados vegetarianos", "Postres frecuentes", "Frituras", "Bebidas azucaradas"]
  }
];

export const curatedNutritionPlans = publicNutritionGuidelinePlans;
