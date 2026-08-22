# Guia de uso — Física Resolvida

Este guia apresenta o acesso, o cadastro, o painel de gerenciamento, o faturamento e os cuidados operacionais do site Física Resolvida.

## 1. Primeiro acesso do proprietário

1. Abra o endereço publicado do site.
2. Selecione **Entrar com ChatGPT**.
3. Use a sua própria conta ChatGPT. A plataforma não cria nem armazena senha própria.
4. No primeiro acesso humano, a conta autenticada recebe o papel **Administrador**.
5. Preencha os dados obrigatórios: nome, telefone, nível escolar e endereço.
6. Se desejar, envie uma imagem e informe Lattes, ORCID e redes sociais.
7. Leia e aceite os Termos de Uso e o Aviso de Privacidade versionados para concluir o cadastro.

> O e-mail vem da identidade autenticada e não é alterado no formulário.

## 2. Identidades administrativas iniciais

- **Proprietário:** é a primeira pessoa que entra no site e conclui o cadastro. É o único administrador humano inicial.
- **Codex · automação:** é um ator técnico, marcado como conta técnica e sem login. Ele existe somente para identificar inicializações e automações na auditoria. Não possui senha, sessão ou acesso interativo.

Essa separação evita uma conta compartilhada e permite distinguir ações humanas de operações técnicas. As mudanças no código também ficam registradas no histórico de commits do GitHub.

## 3. Uso do acervo

1. Em **Banco de questões**, use os filtros por instituição, edição, assunto e dificuldade.
2. Abra uma questão para testar uma alternativa e conferir o gabarito.
3. Use **Baixar PDF** quando o arquivo original estiver disponível.
4. Use **Gerador de provas** para selecionar questões e montar uma folha de atividades.
5. Acesse **Roteiros** para preparar as resoluções em vídeo.
6. Professores, gerentes e administradores podem acessar **Cadastrar questão**.

## 4. Minha conta

1. Abra **Minha conta**.
2. Na aba **Perfil e endereço**, edite dados pessoais, endereço e informações acadêmicas.
3. Para trocar a imagem, escolha um JPEG, PNG ou WebP de até 2 MB.
4. Na aba **Faturamento**, informe os dados do pagador e o endereço de cobrança.
5. Salve cada aba separadamente.

O sistema não armazena número de cartão nem CVV. Quando pagamentos forem ativados, esses dados deverão ser tratados por um provedor de pagamentos.

## 5. Papéis e permissões

| Papel | Acesso principal |
| --- | --- |
| Usuário | Acervo, gerador, roteiros, perfil e faturamento próprio |
| Professor | Recursos do usuário, cadastro de conteúdo e painel acadêmico |
| Gerente | CRUD de usuários e professores, estados de acesso e faturamento mascarado |
| Administrador | Controle completo de papéis, usuários, equipe e faturamento |

Gerentes não podem criar ou promover gerentes e administradores. Ninguém pode alterar o próprio papel ou estado. O último administrador humano ativo não pode ser removido, bloqueado ou rebaixado.

## 6. Cadastrar usuários e equipe

1. Entre em **Painel de gestão → Usuários e equipe**.
2. Selecione **Novo cadastro**.
3. Informe os dados obrigatórios e escolha o papel permitido.
4. Salve o cadastro.
5. A pessoa deve entrar com uma conta ChatGPT cujo e-mail seja igual ao e-mail cadastrado.
6. No primeiro acesso, ela confirma os dados e aceita a declaração de privacidade.

Cadastros feitos diretamente pela tela pública de login sempre começam como **Usuário**. Papéis privilegiados são concedidos somente pelo painel.

## 7. Editar, inativar, suspender ou bloquear

1. Em **Usuários e equipe**, pesquise por nome, e-mail ou telefone.
2. Selecione o cadastro.
3. Para editar dados, abra **Editar dados cadastrais**.
4. Para alterar o papel, escolha o novo papel e selecione **Aplicar papel**.
5. Para controlar o acesso, escolha:
   - **Ativo:** acesso normal;
   - **Inativo:** desligamento administrativo reversível;
   - **Suspenso:** bloqueio temporário, com data futura obrigatória;
   - **Bloqueado:** bloqueio por prazo indeterminado.
6. Informe sempre uma justificativa e confirme.

A exclusão administrativa anonimiza os dados pessoais e de faturamento. A trilha mínima de auditoria é preservada.

## 8. Faturamento

1. Cada pessoa cadastra os próprios dados em **Minha conta → Faturamento**.
2. Administradores e gerentes consultam os perfis em **Painel → Faturamento**.
3. Documentos aparecem mascarados no painel.
4. Plano, assinatura, cobrança e pagamento ainda estão preparados apenas em nível cadastral; nenhuma cobrança automática está ativa.

Antes de iniciar cobranças reais, configure um provedor de pagamentos, revise juridicamente a política de privacidade e os termos de uso, informe o canal oficial do controlador, e defina emissão fiscal e regras de cancelamento/reembolso.

## 9. Auditoria

O painel registra criação de contas, conclusão de cadastro, alterações de perfil, papel, estado, faturamento e anonimização. A visão geral mostra o ator e o cadastro afetado.

- Ações humanas aparecem com o nome do administrador ou gerente.
- Inicializações técnicas aparecem como **Codex · automação**.
- Alterações no projeto aparecem no histórico do repositório GitHub.

## 10. Publicação e acesso externo

O site deve permanecer privado durante a configuração inicial. Enquanto estiver restrito ao proprietário, visitantes externos não conseguem concluir o cadastro. Para abrir o sistema ao público, altere conscientemente a política de acesso do Sites e valide antes:

1. termos e privacidade;
2. proteção do conteúdo premium no servidor;
3. e-mail e atendimento ao usuário;
4. provedor de pagamento;
5. backups, retenção e processo LGPD.

## 11. Segurança operacional

- Nunca compartilhe sua conta ChatGPT.
- Não cadastre cartão ou CVV em campos livres.
- Use o princípio do menor privilégio ao atribuir papéis.
- Suspenda temporariamente quando houver prazo definido; bloqueie apenas quando o impedimento for indefinido.
- Revise a auditoria depois de operações administrativas importantes.
- Antes da monetização, mova enunciados premium, gabaritos e arquivos protegidos para APIs/armazenamento com autorização no servidor.
