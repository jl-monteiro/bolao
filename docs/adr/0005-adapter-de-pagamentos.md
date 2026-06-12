# Adapter de pagamentos

O backend isolara Pix, reembolsos e premiacoes atras de `PaymentProvider`. O desenvolvimento comecara com `FakePaymentProvider` para webhooks e falhas deterministicas, seguido pelo sandbox do Mercado Pago. Mercado Pago sera o provedor de producao e seu fluxo validara o CPF financeiro no MVP, sem provedor KYC separado. Dinheiro real so sera habilitado depois de validar no sandbox identidade e titularidade, Pix, reembolsos, custodia, conciliacao, webhooks idempotentes e pagamento para o CPF vencedor.
