# Adapter de dados esportivos

O backend isolara dados esportivos atras de `SportsDataProvider` e usara `football-data.org` inicialmente por incluir FIFA World Cup no plano gratuito. A temporada 2026 sera verificada automaticamente antes do uso; sem fixtures disponiveis, o adapter alternara para API-Football, sem alterar o dominio.
