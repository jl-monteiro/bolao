# Bolao

Plataforma para organizar competicoes de palpites esportivos com contribuicao financeira e premiacao.

## Language

**Grupo**:
Comunidade privada e persistente de usuarios, identificada por nome, descricao e imagem opcional, acessada por convite e capaz de organizar um ou mais boloes ao longo do tempo.

**Convite**:
Permissao emitida e revogavel pelo Proprietario do Grupo ou por um Organizador para um Usuario iniciar entrada em um Grupo, valida por sete dias. Nao realiza Inscricao nem autoriza pagamento; quando aceita por um Ex-membro nao anonimizado, restaura seu vinculo e agrega o historico anterior ao perfil atual sem duplicar identidade. Historico anonimizado permanece separado.

**Proprietario do Grupo**:
Organizador com autoridade para promover, rebaixar ou remover Organizadores e iniciar Transferencia de Propriedade. Nao pode rebaixar ou remover um Organizador enquanto ele for Responsavel por Bolao nao encerrado.

**Transferencia de Propriedade**:
Pedido revogavel e unico para outro Membro assumir como Proprietario do Grupo, valido por sete dias. Novo pedido exige revogar o anterior. Ate o destinatario aceitar com MFA configurado, propriedade e responsabilidades permanecem com o Proprietario atual; revogacao notifica o destinatario. Quando aceita, Membro comum torna-se automaticamente Organizador e Proprietario, o anterior permanece Organizador e os Responsaveis por Boloes existentes nao mudam. Retorno posterior de Proprietario substituido por sucessao excepcional nao restaura a propriedade; seus papeis ficam sujeitos ao novo Proprietario.
_Avoid_: Dono

**Organizador**:
Membro autorizado a criar Boloes, definir seus jogos e regras, emitir e revogar Convites, remover Membros comuns elegiveis e participar dos Boloes como qualquer outro Participante. Nao pode rebaixar ou remover outro Organizador.
_Avoid_: Manager, administrador

**Responsavel pelo Bolao**:
Organizador que criou um Bolao e possui autoridade exclusiva para edita-lo ou cancela-lo. O Proprietario do Grupo pode assumir essa responsabilidade antes da primeira Contribuicao; depois de pagamentos, sua ausencia nao interrompe o ciclo automatico nem transfere poderes a outro Membro. A plataforma pode intervir excepcionalmente com Registro de Auditoria, sem assumir ou transferir o papel.

**Intervencao da Plataforma**:
Acao excepcional e auditada sobre um Bolao por fraude, ilegalidade, risco financeiro, falha tecnica grave ou obrigacao legal. Nao pode ocorrer por conveniencia do Grupo nem transforma a plataforma em Responsavel pelo Bolao.

**Bolao**:
Competicao financeira identificada por titulo e descricao dentro de um Grupo, composta por entre um e cinquenta Jogos de uma ou mais competicoes, realizados em uma janela maxima de trinta dias, e com regras, prazo, contribuicao e premio proprios. Continua valida enquanto ao menos um Jogo permanecer valido. Jogos, valor, pontuacao e prazos ficam imutaveis apos a primeira Contribuicao confirmada.
_Avoid_: Aposta, grupo

**Bolao Arquivado**:
Bolao encerrado preservado no historico do Grupo com Jogos, Palpites, ranking, distribuicao original do Premio e nome e foto dos Participantes no Fechamento, incluindo marcacoes de Invalidacao Historica. Alteracoes posteriores de perfil nao mudam esse registro, mas Anonimizacao substitui a identificacao; dados privados nunca sao expostos.

**Estado do Bolao**:
Etapa do ciclo de vida: Rascunho, Inscricoes Abertas, Em Andamento, Aguardando Resultados, Fechado ou Cancelado.

**Publicacao**:
Confirmacao do Responsavel pelo Bolao que, apos validacao de jogos, datas, faixas, Contribuicao e limites, muda o Bolao de Rascunho para Inscricoes Abertas. Alteracoes continuam permitidas ate a primeira Contribuicao confirmada, mas ficam temporariamente bloqueadas enquanto existir tentativa de pagamento pendente.

**Jogo**:
Jogo de futebol entre mandante e visitante, selecionado por um Organizador exclusivamente no catalogo da fonte esportiva integrada para compor um Bolao. Sua identidade no Bolao permanece a mesma quando a fonte cria outro identificador para remarcacao ou continuacao, mas eventos semelhantes nao sao vinculados sem confirmacao explicita da fonte ou revisao auditada da plataforma. Revisao exige coincidencia de competicao, temporada e confronto, alem de referencia oficial da remarcacao; persistindo duvida, o evento nao e vinculado e o Jogo e anulado depois de sete dias. Ao criar o Bolao, cada Jogo deve comecar entre vinte e quatro horas e noventa dias no futuro.
_Avoid_: Partida, evento

**Jogo Adiado**:
Jogo remarcado que permanece valido se realizado em ate sete dias; apos esse prazo, torna-se Jogo Anulado. Antes de comecar, seu novo horario redefine o prazo dos Palpites. Se atualizacao tardia causar revelacao indevida no horario original, o Jogo e anulado quando ao menos vinte por cento dos Participantes elegiveis e inscritos naquele momento ainda nao possuem Palpite; abaixo desse limite, todos os Palpites ficam congelados ate o novo inicio, inclusive ausencias, sem novos envios ou alteracoes. A falha e auditada e notificada e pode gerar compensacao separada. Mudanca apenas de estadio, sem inversao dos times, preserva os Palpites e gera Notificacao. Inversao oficial de mandante e visitante antes do inicio invalida os Palpites desse Jogo, notifica os Participantes e reabre o envio ate o novo horario. Um Jogo ja iniciado ou continuado depois de interrupcao nunca reabre e usa os mesmos Palpites, orientados pela identidade dos times mesmo quando o mando de campo muda.

**Jogo Anulado**:
Jogo cancelado ou adiado por mais de sete dias conforme a fonte esportiva, ou comprometido para todos por falha grave da plataforma depois do inicio do Bolao. Nunca e anulado pelo Responsavel pelo Bolao. Falha da plataforma exige anulacao quando afetar ao menos vinte por cento dos Participantes ou impedir envios por quinze minutos continuos durante a hora final. O Jogo e desconsiderado da Pontuacao de todos, mas permanece no historico com seus Palpites confirmados e indicacao de anulacao, preservando os demais Jogos.

**Palpite**:
Previsao unica de placar por Participante e Jogo, com zero a vinte gols inteiros por time, enviada ou alterada ate o inicio oficial real. Cada envio gera Comprovante de Palpite. Se uma atualizacao tardia da fonte revelar que o Jogo ja havia iniciado, versoes confirmadas depois do inicio real sao invalidadas e a ultima versao valida anterior e restaurada; sem versao anterior, o Palpite fica ausente. O incidente e auditado. Nunca e aceito depois do inicio, inclusive por falha da plataforma; falha comprovada pode gerar compensacao separada sem alterar ranking ou Premio. Permanece secreta ate o inicio real, inclusive quando o horario original de um Jogo Adiado ja passou, e depois fica visivel aos demais Participantes do Bolao; sua ausencia vale zero ponto e nao gera reembolso.
_Avoid_: Aposta

**Comprovante de Palpite**:
Registro imutavel do conteudo e horario de cada envio ou alteracao confirmado de Palpite. O detalhe fica disponivel na area autenticada; antes do inicio do Jogo, e-mail e Notificacao identificam apenas horario e Jogo, sem revelar o placar. Tentativa falha gera registro separado e mantem o ultimo Palpite confirmado. Versoes invalidadas ficam visiveis somente ao autor e na auditoria; os demais veem apenas a versao valida usada na Pontuacao. Fundamenta Contestacoes e permite corrigir somente falhas comprovadas ocorridas antes do inicio do Jogo.

**Pontuacao**:
Resultado acumulado dos Palpites de um Participante, calculado pelo placar ao fim do tempo regulamentar e acrescimos: cinco pontos por placar exato, tres por acertar vencedor ou empate, zero nos demais casos. Prorrogacao e penaltis sao ignorados.

**Ranking de Desempenho**:
Classificacao historica dos Membros de um Grupo por pontos validos acumulados apenas em Boloes fechados, atribuidos ao periodo do Fechamento, consultavel por mes, ano ou todos os tempos e exibida por padrao no ano atual. Usa nome e foto atuais dos Membros e os registrados na Saida do Grupo para Ex-membros; cada Bolao Arquivado preserva o perfil do Fechamento. Usa ranking de competicao: valores iguais compartilham a mesma posicao, a proxima posicao considera quantos estao acima, e empatados aparecem em ordem alfabetica. Bolao ativo possui ranking provisorio somente dentro dele.

**Ranking Financeiro**:
Classificacao historica separada dos Membros de um Grupo por Premios validos efetivamente recebidos, incluindo Centavo Residual, apenas em Boloes fechados. Pagamento pendente nao integra o total; quando liquidado, e atribuido retroativamente ao periodo do Fechamento, com indicacao da atualizacao e da data real de liquidacao no detalhe. O ranking e consultavel por mes, ano ou todos os tempos e exibido por padrao no ano atual, usando nome e foto atuais dos Membros e os registrados na Saida do Grupo para Ex-membros. Usa ranking de competicao: valores iguais compartilham a mesma posicao, a proxima posicao considera quantos estao acima, e empatados aparecem em ordem alfabetica. Invalidacoes Historicas podem fazer seu total divergir da distribuicao original dos Premios.

**Resultado Oficial**:
Placar de um Jogo ao fim do tempo regulamentar e acrescimos, obtido automaticamente da fonte esportiva integrada, sem edicao por Organizadores. Prorrogacao e penaltis nao integram esse placar; em Jogo abandonado, vale o placar homologado pela competicao. Se houver continuacao remarcada, o resultado aguarda por ate sete dias. Em revisao por instabilidade, uma confirmacao so e confiavel quando coincide com a fonte oficial da competicao ou com uma segunda fonte independente; sem confirmacao, o Jogo e anulado. Correcao recebida depois do Fechamento nao recalcula Pontuacao ou Premio; o dado usado permanece preservado e a mudanca posterior fica registrada no historico e na auditoria.

**Fechamento**:
Confirmacao definitiva do ranking depois que todos os Jogos possuem Resultado Oficial e nenhuma correcao relevante ocorre por tres horas. Enquanto existir resultado pendente, o Bolao aguarda; cada correcao anterior ao Fechamento recalcula a Pontuacao e reinicia a espera de tres horas. Se a instabilidade persistir por sete dias depois do fim do ultimo Jogo, a automacao e suspensa e a plataforma revisa o caso para usar a ultima confirmacao confiavel ou anular o Jogo. Depois do Fechamento, o resultado fica congelado para premiacao. A plataforma pode suspende-lo por ate sete dias mediante indicios concretos de fraude identificados em analise preliminar e registrados em auditoria; denuncia isolada nao basta. Investigacao formal aberta antes do Fechamento preserva a possibilidade de Desclassificacao e mantem o Fechamento suspenso pelo prazo aplicavel. Extensao exige obrigacao legal ou dependencia externa documentada e notificada. Sem fraude comprovada ou extensao valida ao fim do prazo, a suspensao expira e o Fechamento segue automaticamente, sem impedir investigacao posterior.

**Contestacao**:
Relato, antes do Fechamento, de erro em Jogo, Palpite, Pontuacao ou ranking por um Participante. Depois do pagamento, nao altera ranking ou Premio; eventual compensacao e tratada separadamente pela plataforma.

**Denuncia**:
Relato de fraude, ilegalidade ou abuso por um Usuario, permitido mesmo depois do Fechamento. So suspende o Fechamento quando analise preliminar encontra indicios concretos.

**Notificacao**:
Aviso enviado por e-mail e exibido na plataforma sobre convites, pagamentos, mudancas de Jogos, prazos, resultados, premios e reembolsos. Invalidacao de versao tardia de Palpite gera aviso imediato com motivo, versao invalidada e versao valida restaurada. Pagamento do Premio pendente gera aviso persistente e lembretes por noventa dias; depois, o aviso permanece na conta sem lembretes frequentes.

**Cancelamento**:
Encerramento de um Bolao com reembolso integral das Contribuicoes. Somente o Responsavel pelo Bolao pode cancela-lo antes do primeiro Jogo; a plataforma pode cancelar quando falha grave comprometer a integridade da competicao. Indisponibilidade antes do primeiro Jogo exige Cancelamento quando afetar ao menos vinte por cento dos Participantes ou impedir envios por quinze minutos continuos durante a hora final. Se todos os Jogos forem anulados, o Bolao e cancelado automaticamente.

**Suspensao**:
Bloqueio aplicado pela plataforma a um Usuario ou Grupo, impedindo novas inscricoes e pagamentos sem apagar registros. Se aplicada ao Proprietario do Grupo por fraude, remove seus poderes e inicia Transferencia de Propriedade excepcional e auditada para o Organizador elegivel promovido ha mais tempo; empate usa a entrada mais antiga no Grupo. A mesma sucessao pode ser iniciada por incapacidade comprovada ou, mediante pedido de Organizador e tentativas de contato, apos noventa dias sem acesso do Proprietario. Em recusa ou expiracao, o pedido segue para o proximo elegivel ate haver aceite com MFA; sem candidato, o Grupo torna-se Grupo Restrito. Boloes existentes permanecem preservados ate decisao de cancelar ou liquidar.

**Grupo Restrito**:
Grupo sem Proprietario ativo, impedido de emitir Convites, criar Boloes, aceitar Inscricoes ou receber pagamentos. Bolao ainda nao iniciado segue com os pagantes existentes quando ja estiver Ativado; sem Ativacao, e cancelado imediatamente com reembolso. Boloes ja iniciados continuam seus resultados, Fechamento, Pagamentos do Premio e reembolsos automaticos. A plataforma pode restaurar a gestao por Transferencia de Propriedade auditada para Membro elegivel ja existente; aceite com MFA encerra a restricao causada pela ausencia de Proprietario.

**Grupo Arquivado**:
Grupo permanentemente encerrado com historico preservado, sem Bolao ativo ou pendencia financeira. Ocorre quando um Grupo Restrito nao possui Membro elegivel ou ao fim de um Arquivamento Pendente. No arquivamento, todos os Membros se tornam Ex-membros e mantem acesso somente aos Boloes de que participaram, sem reativacao, novo conteudo ou reconvocacao automatica.

**Arquivamento Pendente**:
Espera revogavel de sete dias iniciada pelo Proprietario com MFA antes do arquivamento voluntario do Grupo, permitida somente sem Bolao publicado ou pendencia financeira. Membros sao notificados com a lista de Boloes em Rascunho que serao descartados; Convites, novos Boloes, Inscricoes, pagamentos e Transferencia de Propriedade ficam bloqueados, enquanto consultas continuam disponiveis. Somente o Proprietario pode revogar, usando MFA. Suspensao do Proprietario cancela a espera automaticamente e inicia sua sucessao excepcional. Ao fim, os Rascunhos sao descartados; exportacao nao integra o MVP.

**Desclassificacao**:
Exclusao auditada, antes do Fechamento, de um Participante do ranking e da premiacao de um Bolao por fraude comprovada. Os Participantes elegiveis sao reordenados e recebem o Premio conforme suas novas colocacoes. A Contribuicao do desclassificado permanece no Premio, salvo obrigacao legal ou falha da plataforma; seus Palpites, o Resultado Oficial e a Pontuacao calculada permanecem preservados no Registro de Auditoria. Fraude comprovada depois do Fechamento nao reabre o Bolao nem altera pagamentos dos demais; eventual Premio indevido e cobrado separadamente do fraudador.

**Invalidacao Historica**:
Marcacao auditada de uma participacao por fraude comprovada depois do Fechamento. Exclui seus pontos e Premio dos rankings historicos do Grupo, sem recalcular o Bolao, promover outros Participantes ou gerar novos pagamentos. Se o Pagamento do Premio ainda estiver bloqueado, nao e liquidado nem redistribuido e recebe o destino previsto para Premio sem Elegivel.

**Registro de Auditoria**:
Historico imutavel de acoes administrativas, financeiras e de integracao, contendo autor, momento e valores anteriores e novos quando aplicavel.

**Participante**:
Usuario maior de dezoito anos, com identidade validada, inscrito em um Bolao e elegivel conforme suas regras.

**Membro**:
Usuario maior de dezoito anos, com e-mail verificado e identidade validada, pertencente a um Grupo. Quando nao possui papel de Organizador, pode ser removido por um Organizador somente se nao estiver inscrito em Bolao ativo nem possuir pagamento ou reembolso pendente.

**Membro Pendente**:
Usuario com Convite aceito que aguarda validacao de identidade. Ainda nao pertence ao Grupo, nao acessa seu conteudo privado e nao pode se inscrever em Boloes; o vinculo pendente expira apos trinta dias e exige novo Convite.

**Saida do Grupo**:
Encerramento voluntario do vinculo de um Membro com um Grupo, permitido somente quando nao estiver inscrito em Bolao ativo nem possuir pagamento ou reembolso pendente. O Proprietario do Grupo deve transferir a propriedade para outro Membro elegivel antes de sair. A Saida preserva sua participacao historica como Ex-membro, sem acesso ao conteudo futuro do Grupo.

**Ex-membro**:
Usuario que saiu ou foi removido de um Grupo. Permanece identificado pelo nome exibido ao fim do vinculo e pode consultar somente os Boloes dos quais participou ate essa data, com nomes, fotos, Palpites, rankings e Premios daquele historico. Nao acessa o Perfil no Grupo atual dos demais, Boloes ou conteudo futuros, salvo Anonimizacao posterior.

**Perfil no Grupo**:
Nome, foto opcional, rankings, Premios e Palpites ja liberados de um Usuario dentro de um Grupo. E visivel somente a Membros e Ex-membros autorizados ao historico daquele Grupo, nunca publicamente indexado; CPF, e-mail, telefone e dados Pix permanecem privados.
_Avoid_: Perfil Publico

**Anonimizacao**:
Remocao da identificacao publica de um Usuario apos sua solicitacao, permitida quando nao houver Bolao ativo ou pagamento pendente. Nome e foto sao substituidos por identificador neutro estavel dentro de cada Grupo, como `Participante anonimizado 1`, sem reutilizacao entre Grupos. Pontos, Palpites, valores e registros financeiros permanecem sem vinculo publico pelo prazo aplicavel. Se o Usuario voltar ao Grupo, inicia novo historico publico sem restaurar ou mesclar o anterior. A plataforma remove vinculos explicitos, mas nao garante impedir inferencias de Membros que ja conheciam o historico.

**Contribuicao**:
Valor financeiro fixo em reais, entre cinco e dois mil reais, pago via Pix por um Participante para ingressar em um Bolao e palpitar em todos os seus Jogos. Reversao apos o inicio do primeiro Jogo nao remove a participacao nem reduz o Premio nominal; bloqueia eventual Pagamento do Premio ao Participante e inicia investigacao, sem transferir o deficit aos demais. Comprovada falha bancaria sem culpa do Participante, o pagamento e desbloqueado e nenhuma nova Contribuicao e exigida. Reposicao da Contribuicao nao e aceita apos o inicio. Reversao provocada pelo Participante constitui fraude e sujeita sua participacao a Desclassificacao ou Invalidacao Historica.
_Avoid_: Aposta

**Inscricao**:
Entrada unica por CPF em um Bolao mediante Contribuicao, permitida somente antes do inicio do primeiro Jogo e enquanto o Premio nao atingir vinte mil reais. A ordem da Inscricao nasce na confirmacao valida da Contribuicao. Uma tentativa de pagamento reserva capacidade por quinze minutos, sem ultrapassar o inicio do primeiro Jogo; sem confirmacao dentro desse prazo, expira. Quando confirmacoes concorrentes excedem o limite, prevalece a primeira confirmacao efetiva do provedor; sem ordem confiavel, vale a recepcao auditada pela plataforma e, em empate tecnico, o identificador imutavel do pagamento. Confirmacao recebida depois da expiracao, do inicio ou do preenchimento da capacidade nao cria Inscricao e gera reembolso automatico, mesmo que o valor tenha sido recebido. Nova tentativa exige reconfirmacao explicita das regras, valor e Jogos vigentes. Reversao da Contribuicao antes do primeiro Jogo cancela a Inscricao, remove seu valor do Premio e recalcula a Ativacao.

**Desistencia**:
Saida voluntaria de um Bolao com reembolso integral, permitida quando solicitada de forma auditada ate o instante exato de vinte e quatro horas antes do primeiro Jogo; atraso do provedor nao altera esse direito. Se o primeiro Jogo for antecipado depois de o prazo original ser definido, esse prazo e preservado ate o novo inicio real. Depois do prazo aplicavel, fica bloqueada e a Contribuicao permanece no Premio. Enquanto o prazo de Inscricao estiver aberto, o Participante pode se inscrever novamente uma unica vez, com nova Contribuicao e nova ordem de Inscricao; nova Desistencia tambem recebe reembolso integral, mas encerra definitivamente sua participacao naquele Bolao e impede terceira Inscricao.

**Ativacao**:
Estado dinamico anterior ao primeiro Jogo em que um Bolao possui ao menos dois Participantes com Contribuicao paga. Pode ser perdido por Desistencia; sem Ativacao no inicio do primeiro Jogo, ocorre Cancelamento automatico. Desclassificacao posterior nao desfaz a Ativacao; se restar um unico Participante elegivel, ele recebe todo o Premio.

**Premio**:
Total das Contribuicoes de um Bolao, limitado a vinte mil reais e distribuido automaticamente via Pix apos o Fechamento conforme suas Faixas de Premiacao. O destino deve pertencer ao mesmo CPF validado do Participante; falhas ficam pendentes para nova tentativa e taxas externas nao reduzem esse valor.

**Premio sem Elegivel**:
Premio sem destinatario porque todos os Participantes foram desclassificados. Permanece bloqueado durante a apuracao e depois recebe o destino exigido por lei e pelo provedor de pagamento, com preferencia pela devolucao as origens quando permitida; a plataforma nao incorpora o valor.

**Pagamento do Premio**:
Liquidacao individual da parcela do Premio devida a um Participante. Uma falha, ausencia de destino Pix valido ou investigacao financeira deixa somente esse pagamento pendente, sem redistribuicao ou prazo de perda, sem alterar o estado Fechado do Bolao nem seus rankings historicos; parcelas dos demais seguem normalmente. Investigacao iniciada depois do Fechamento bloqueia somente a parcela do suspeito.

**Faixa de Premiacao**:
Percentual do Premio atribuido a uma colocacao, configurado por um Organizador antes da primeira Contribuicao; o conjunto deve somar cem por cento e diminuir estritamente a cada colocacao. O ranking usa posicoes de competicao: dois empatados em primeiro ocupam a primeira e a segunda posicoes, e o proximo fica em terceiro. Em empate, os percentuais das colocacoes ocupadas sao somados e divididos igualmente entre os empatados; quando empate na primeira colocacao excede todas as faixas, todo o Premio e dividido igualmente entre eles. Empates fora das colocacoes premiadas nao criam novas faixas. Faixas sem Participante elegivel sao removidas e seus percentuais redistribuidos proporcionalmente entre as faixas ocupadas; faixas de sessenta, trinta e dez por cento com apenas dois elegiveis tornam-se 66,67% e 33,33%, antes do ajuste do Centavo Residual.

**Centavo Residual**:
Valor indivisivel restante do calculo do Premio, feito sem arredondamentos intermediarios e arredondado somente nos pagamentos finais. E distribuido um centavo por vez da melhor para a pior colocacao; entre Participantes empatados, a ordem de Inscricao serve somente para esse arredondamento.
