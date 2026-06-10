# Bolao

Plataforma para organizar competicoes de palpites esportivos com contribuicao financeira e premiacao.

## Language

**Grupo**:
Comunidade privada e persistente de usuarios, identificada por nome, descricao e imagem opcional, acessada por convite e capaz de organizar um ou mais boloes ao longo do tempo.

**Convite**:
Permissao para um Usuario entrar em um Grupo. Nao realiza Inscricao nem autoriza pagamento.

**Proprietario do Grupo**:
Membro com autoridade para promover ou remover Organizadores e transferir a propriedade do Grupo. A transferencia nao altera os Responsaveis por Boloes existentes.
_Avoid_: Dono

**Organizador**:
Membro autorizado a criar Boloes, definir seus jogos e regras e participar deles como qualquer outro Participante.
_Avoid_: Manager, administrador

**Responsavel pelo Bolao**:
Organizador que criou um Bolao e possui autoridade exclusiva para edita-lo ou cancela-lo. O Proprietario do Grupo pode assumir essa responsabilidade antes da primeira Contribuicao; depois de pagamentos, sua ausencia nao interrompe o ciclo automatico nem transfere poderes a outro Membro.

**Bolao**:
Competicao financeira identificada por titulo e descricao dentro de um Grupo, composta por entre um e cinquenta Jogos de uma ou mais competicoes, realizados em uma janela maxima de trinta dias, e com regras, prazo, contribuicao e premio proprios. Jogos, valor, pontuacao e prazos ficam imutaveis apos a primeira Contribuicao confirmada.
_Avoid_: Aposta, grupo

**Bolao Arquivado**:
Bolao encerrado preservado no historico do Grupo com Jogos, Palpites, ranking e distribuicao do Premio, sem exposicao de dados privados.

**Estado do Bolao**:
Etapa do ciclo de vida: Rascunho, Inscricoes Abertas, Em Andamento, Aguardando Resultados, Fechado, Cancelado ou Pagamento Pendente.

**Publicacao**:
Confirmacao do Responsavel pelo Bolao que, apos validacao de jogos, datas, faixas, Contribuicao e limites, muda o Bolao de Rascunho para Inscricoes Abertas. Alteracoes continuam permitidas ate a primeira Contribuicao confirmada, mas ficam temporariamente bloqueadas enquanto existir tentativa de pagamento pendente.

**Jogo**:
Jogo de futebol entre mandante e visitante, selecionado por um Organizador exclusivamente no catalogo da fonte esportiva integrada para compor um Bolao. Ao criar o Bolao, cada Jogo deve comecar entre vinte e quatro horas e noventa dias no futuro.
_Avoid_: Partida, evento

**Jogo Adiado**:
Jogo remarcado que permanece valido se realizado em ate sete dias; apos esse prazo, torna-se Jogo Anulado. Antes de comecar, seu novo horario redefine o prazo dos Palpites; um Jogo ja iniciado nunca reabre.

**Jogo Anulado**:
Jogo cancelado ou adiado por mais de sete dias, desconsiderado da Pontuacao de todos os Participantes.

**Palpite**:
Previsao unica de placar por Participante e Jogo, com zero a vinte gols inteiros por time, enviada ou alterada ate o inicio oficial. Permanece secreta ate esse inicio e depois fica visivel aos demais Participantes do Bolao; sua ausencia vale zero ponto e nao gera reembolso.
_Avoid_: Aposta

**Pontuacao**:
Resultado acumulado dos Palpites de um Participante, calculado pelo placar ao fim do tempo regulamentar e acrescimos: cinco pontos por placar exato, tres por acertar vencedor ou empate, zero nos demais casos. Prorrogacao e penaltis sao ignorados.

**Ranking de Desempenho**:
Classificacao historica dos Membros de um Grupo por pontos acumulados apenas em Boloes fechados, atribuidos ao periodo do Fechamento, consultavel por mes, ano ou todos os tempos e exibida por padrao no ano atual. Valores iguais compartilham a mesma posicao e aparecem em ordem alfabetica; Bolao ativo possui ranking provisorio somente dentro dele.

**Ranking Financeiro**:
Classificacao historica separada dos Membros de um Grupo por Premios recebidos apenas em Boloes fechados, atribuidos ao periodo do Fechamento, consultavel por mes, ano ou todos os tempos e exibida por padrao no ano atual. Valores iguais compartilham a mesma posicao e aparecem em ordem alfabetica.

**Resultado Oficial**:
Placar de um Jogo obtido automaticamente da fonte esportiva integrada, sem edicao por Organizadores.

**Fechamento**:
Confirmacao definitiva do ranking tres horas apos todos os Jogos terem Resultado Oficial confirmado. Enquanto existir resultado pendente, o Bolao aguarda; correcoes anteriores ao Fechamento recalculam a Pontuacao e, depois dele, o resultado fica congelado para premiacao.

**Contestacao**:
Relato de erro por um Participante antes do Fechamento. Depois do pagamento, nao altera ranking ou Premio; eventual compensacao e tratada separadamente pela plataforma.

**Notificacao**:
Aviso enviado por e-mail e exibido na plataforma sobre convites, pagamentos, mudancas de Jogos, prazos, resultados, premios e reembolsos.

**Cancelamento**:
Encerramento de um Bolao com reembolso integral das Contribuicoes. Um Organizador pode cancelar antes do primeiro Jogo; depois disso, somente a plataforma pode cancelar por falha grave.

**Suspensao**:
Bloqueio aplicado pela plataforma a um Usuario ou Grupo, impedindo novas inscricoes e pagamentos sem apagar registros. Boloes existentes permanecem preservados ate decisao de cancelar ou liquidar.

**Registro de Auditoria**:
Historico imutavel de acoes administrativas, financeiras e de integracao, contendo autor, momento e valores anteriores e novos quando aplicavel.

**Participante**:
Usuario maior de dezoito anos, com identidade validada, inscrito em um Bolao e elegivel conforme suas regras.

**Membro**:
Usuario maior de dezoito anos, com e-mail verificado e identidade validada, pertencente a um Grupo. Pode ser removido por um Organizador somente quando nao estiver inscrito em Bolao ativo.

**Perfil Publico**:
Nome, foto opcional, rankings e Palpites ja liberados de um Usuario. CPF, e-mail, telefone e dados Pix permanecem privados.

**Anonimizacao**:
Remocao da identificacao publica de um Usuario apos sua solicitacao, permitida quando nao houver Bolao ativo ou pagamento pendente. Registros financeiros e resultados permanecem pelo prazo aplicavel.

**Contribuicao**:
Valor financeiro fixo em reais, entre cinco e dois mil reais, pago via Pix por um Participante para ingressar em um Bolao e palpitar em todos os seus Jogos.
_Avoid_: Aposta

**Inscricao**:
Entrada unica por CPF em um Bolao mediante Contribuicao, permitida somente antes do inicio do primeiro Jogo e enquanto o Premio nao atingir vinte mil reais. Uma tentativa de pagamento reserva capacidade por quinze minutos; sem confirmacao, expira.

**Desistencia**:
Saida voluntaria de um Bolao com reembolso integral, permitida ate vinte e quatro horas antes do primeiro Jogo. Depois desse prazo, a Contribuicao permanece no Premio.

**Ativacao**:
Estado dinamico em que um Bolao possui ao menos dois Participantes com Contribuicao paga. Pode ser perdido por Desistencia; sem Ativacao no inicio do primeiro Jogo, ocorre Cancelamento automatico.

**Premio**:
Total das Contribuicoes de um Bolao, limitado a vinte mil reais e distribuido automaticamente via Pix apos o Fechamento conforme suas Faixas de Premiacao. O destino deve pertencer ao mesmo CPF validado do Participante; falhas ficam pendentes para nova tentativa e taxas externas nao reduzem esse valor.

**Faixa de Premiacao**:
Percentual do Premio atribuido a uma colocacao, configurado por um Organizador antes da primeira Contribuicao; o conjunto deve somar cem por cento e diminuir estritamente a cada colocacao. Em empate, os percentuais das colocacoes ocupadas sao somados e divididos igualmente entre os empatados. Faixas sem Participante elegivel sao removidas e seus percentuais redistribuidos proporcionalmente entre as faixas ocupadas.

**Centavo Residual**:
Valor indivisivel restante do calculo do Premio, distribuido um centavo por vez da melhor para a pior colocacao. Entre Participantes empatados, a ordem de Inscricao serve somente para esse arredondamento.
