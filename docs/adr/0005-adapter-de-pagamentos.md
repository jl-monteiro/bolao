# Adapter de pagamentos

O backend isolara Pix, reembolsos e premiacoes atras de `PaymentProvider`. O desenvolvimento comecara com `FakePaymentProvider` para webhooks e falhas deterministicas; Mercado Pago e o candidato principal de producao, sujeito a validacao de sandbox, split, custodia e pagamento para CPF vencedor.
