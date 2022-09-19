import { prisma } from "../api/dbClient";

async function main() {
  const examples = await prisma.example.findMany();
  console.log(examples);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
