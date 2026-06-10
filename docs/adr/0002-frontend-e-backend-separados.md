# Frontend e backend separados

O sistema tera frontend e backend independentes dentro do monorepo `bolao`, organizado com pnpm e Turborepo, mas com deploys e responsabilidades separados. O frontend usara Next.js, TypeScript, shadcn/ui e TanStack Query; o backend usara NestJS, TypeScript, PostgreSQL e Prisma para publicar uma API REST documentada por OpenAPI. O frontend gerara seu cliente TypeScript desse contrato, evitando acoplamento das regras ao framework de interface e divergencia entre tipos manuais.
