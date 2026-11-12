// Seed de demonstração para o front: um dono fictício e pratos de exemplo.
// Pode rodar várias vezes sem duplicar nada (npm run seed:pratos).
// Dados 100% fictícios; a senha abaixo é só para testes locais.
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DONO_DEMO = {
  name: "Dono Demonstração",
  email: "dono.demo@easyfood.test",
  password: "easyfood-demo"
};

// Pratos por nome de restaurante do seed principal (prisma/seed.js)
const PRATOS = {
  "Burger House": [
    { name: "X-Burger da casa", category: "Lanches", price: 32.9, description: "Pão brioche, blend de 160 g, queijo prato e molho especial." },
    { name: "Smash duplo", category: "Lanches", price: 36.5, description: "Dois smash de 90 g, cheddar e cebola caramelizada." },
    { name: "Batata rústica", category: "Porções", price: 18.5, description: "Porção de 300 g com alecrim e páprica." },
    { name: "Milk-shake de chocolate", category: "Bebidas", price: 21, description: "400 ml, cremoso." }
  ],
  "Pizzaria Napoli": [
    { name: "Margherita", category: "Pizzas", price: 54, description: "Molho de tomate, muçarela, manjericão e azeite." },
    { name: "Calabresa", category: "Pizzas", price: 52, description: "Calabresa fatiada, cebola e azeitonas." },
    { name: "Refrigerante lata", category: "Bebidas", price: 7, description: "350 ml." }
  ],
  "Sushi Express": [
    { name: "Combinado 20 peças", category: "Combinados", price: 79.9, description: "Sashimi, niguiri e uramaki do dia." },
    { name: "Temaki de salmão", category: "Temakis", price: 34, description: "Salmão, cream cheese e cebolinha." },
    { name: "Missoshiru", category: "Entradas", price: 12, description: "Sopa de missô com tofu e cebolinha." }
  ]
};

async function main() {
  const dono = await prisma.user.upsert({
    where: { email: DONO_DEMO.email },
    update: {},
    create: {
      name: DONO_DEMO.name,
      email: DONO_DEMO.email,
      password: await bcrypt.hash(DONO_DEMO.password, 10)
    }
  });

  for (const [restaurantName, pratos] of Object.entries(PRATOS)) {
    const restaurant = await prisma.restaurant.findFirst({ where: { name: restaurantName } });

    if (!restaurant) {
      console.log(`Restaurante "${restaurantName}" não encontrado (rode npm run seed antes). Ignorado.`);
      continue;
    }

    // Só assume restaurantes sem dono, para não mexer em cadastros reais de usuários
    if (restaurant.ownerId === null) {
      await prisma.restaurant.update({ where: { id: restaurant.id }, data: { ownerId: dono.id } });
    }

    const total = await prisma.dish.count({ where: { restaurantId: restaurant.id } });

    if (total > 0) {
      console.log(`${restaurantName} já tem pratos. Ignorado.`);
      continue;
    }

    await prisma.dish.createMany({
      data: pratos.map((prato) => ({ ...prato, restaurantId: restaurant.id }))
    });
    console.log(`${restaurantName}: ${pratos.length} pratos criados.`);
  }

  console.log(`Dono de demonstração: ${DONO_DEMO.email} (senha neste arquivo).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
