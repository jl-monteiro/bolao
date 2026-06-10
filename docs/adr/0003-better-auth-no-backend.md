# Better Auth centralizado no backend

O NestJS hospedara uma unica instancia do Better Auth e o Next.js consumira seu cliente React, mantendo sessoes em cookies HttpOnly. O MVP aceitara login por e-mail e senha ou Google, exigira e-mail verificado e MFA TOTP para Organizadores e antes de alterar o destino Pix ou receber Premio. Aceitamos depender da integracao NestJS mantida pela comunidade para evitar autenticacao propria; autorizacao de Grupos, Boloes e operacoes financeiras permanece no dominio do backend.
