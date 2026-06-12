# Adapter de notificacoes com Resend

O backend isolara e-mails transacionais atras de `NotificationProvider` e usara Resend no MVP para verificacao de e-mail, Convites e avisos financeiros. Notificacoes internas permanecem no dominio e nao dependem diretamente do provedor de e-mail.
