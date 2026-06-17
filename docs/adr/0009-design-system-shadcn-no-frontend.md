# Design system do frontend com shadcn e Tailwind v4

Em 14/06/2026 o incremento `feat/group-invites` introduziu o uso de shadcn/ui como design system do frontend, substituindo o sistema de CSS proprio com tokens `--bolao-` que vigorava ate entao. A decisao foi tomada apos o usuario revisar o material ja implementado e confirmar a adocao consciente, em vez de reverter.

## Decisao

O frontend (@bolao/web) passa a usar **shadcn/ui** sobre **Tailwind v4** como base do design system, mantendo a paleta editorial do Bolao como CSS variables e o navegador de validacao Brave. Componentes visuais devem ser compostos a partir do registry `@/components/ui` ja configurado; novos componentes do registry so sao adicionados quando a necessidade for concreta, evitando duplicacao.

## Consequencias

- `apps/web/components.json` descreve a configuracao do registry (estilo `radix-nova`, baseColor `neutral`, iconLibrary `lucide`, aliases padrao do Next.js).
- `apps/web/src/app/globals.css` foi reescrito para `@import "tailwindcss"`, `@import "tw-animate-css"` e `@import "shadcn/tailwind.css"`, e expoe a paleta editorial do Bolao (ink, paper, green, lime, focus) como CSS variables consumidas por `bg-primary`, `text-foreground`, `border-border` etc.
- Componentes atuais do registry: `button`, `badge`, `alert-dialog`. O `cn()` canonico vive em `apps/web/src/lib/utils.ts`.
- Dependencias adicionadas em `apps/web/package.json`: `shadcn ^4.11`, `radix-ui`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`. DevDependencies: `tailwindcss ^4.1`, `@tailwindcss/postcss ^4.1`, `postcss ^8.5`.
- A redacao anterior da ADR 0002 que citava "shadcn/ui" permaneceu correta; esta ADR registra a adocao efetiva pelo codigo.
- Brave continua como navegador oficial de validacao visual e responsiva.
- Migracoes de pagina que reusem classes proprias devem ser refatoradas para utilitarios do Tailwind/shadcn antes do gate.

## Revogacao da direcao anterior

O CSS proprio com tokens `--bolao-` deixou de ser o sistema visual vigente. Codigo pre-existente que ainda importe esses tokens deve ser migrado em incrementos subsequentes; novos comites nao devem reintroduzir o sistema antigo nem duplicar tokens.
