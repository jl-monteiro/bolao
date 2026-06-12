# Adapter de dados esportivos

O backend isolara dados esportivos atras de `SportsDataProvider` e manterá o dominio generico para futebol. O primeiro catalogo liberado sera somente a Copa do Mundo FIFA 2026, usando `football-data.org` inicialmente por inclui-la no plano gratuito. A temporada 2026 sera verificada automaticamente antes do uso; sem fixtures disponiveis, o adapter alternara para API-Football, sem alterar o dominio.
